/**
 * Certificate of Completion Controller
 *
 * Auto-issues a Certificate record the moment a user finishes every lecture
 * in a course (called from progressController), and renders it as a
 * downloadable PDF on demand using pdfkit (no external asset/font files).
 */

const PDFDocument = require("pdfkit");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const Course = require("../models/Course");

const NAVY = "#0f172a";
const GOLD = "#c9a44c";
const MUTED = "#64748b";

/** Called internally when a course's last lecture is marked complete. */
async function issueCertificateIfEligible(userId, courseId) {
  try {
    const existing = await Certificate.findOne({ user: userId, course: courseId });
    if (existing) return existing;

    const [user, course] = await Promise.all([User.findById(userId), Course.findById(courseId)]);
    if (!user || !course) return null;

    const certificate = await Certificate.create({
      user: userId,
      course: courseId,
      userName: user.name || user.username,
      courseTitle: course.title,
      instructor: course.instructor || "Quantiva",
    });
    return certificate;
  } catch (error) {
    // Unique index race (two requests completing the last lecture at once) — fetch instead.
    if (error.code === 11000) {
      return Certificate.findOne({ user: userId, course: courseId });
    }
    console.error("Error issuing certificate:", error);
    return null;
  }
}

// GET /api/certificates/me
async function getMyCertificates(req, res) {
  try {
    const certificates = await Certificate.find({ user: req.user.id }).sort({ issuedAt: -1 });
    res.json(certificates);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({ error: "Failed to fetch certificates" });
  }
}

// GET /api/certificates/course/:courseId
async function getCertificateForCourse(req, res) {
  try {
    const certificate = await Certificate.findOne({ user: req.user.id, course: req.params.courseId });
    if (!certificate) return res.status(404).json({ error: "No certificate yet for this course" });
    res.json(certificate);
  } catch (error) {
    console.error("Error fetching certificate:", error);
    res.status(500).json({ error: "Failed to fetch certificate" });
  }
}

// GET /api/certificates/verify/:certificateId  (public, no auth — for the /verify page and third parties)
async function verifyCertificate(req, res) {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId }).select(
      "certificateId courseTitle userName instructor issuedAt"
    );
    if (!certificate) {
      return res.status(404).json({ valid: false, error: "No certificate found with this ID." });
    }
    res.json({ valid: true, certificate });
  } catch (error) {
    console.error("Error verifying certificate:", error);
    res.status(500).json({ valid: false, error: "Failed to verify certificate." });
  }
}

// GET /api/certificates/:certificateId/download
async function downloadCertificate(req, res) {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId });
    if (!certificate) return res.status(404).json({ error: "Certificate not found" });

    // Only the certificate's owner (or an admin) may download it.
    if (certificate.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You do not have access to this certificate." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="QSL-Certificate-${certificate.courseTitle.replace(/[^a-z0-9]/gi, "-")}.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
    doc.pipe(res);
    drawCertificate(doc, certificate);
    doc.end();
  } catch (error) {
    console.error("Error generating certificate PDF:", error);
    res.status(500).json({ error: "Failed to generate certificate" });
  }
}

function drawCertificate(doc, certificate) {
  const { width, height } = doc.page;
  const margin = 32;

  // Outer navy border
  doc
    .lineWidth(6)
    .strokeColor(NAVY)
    .rect(margin, margin, width - margin * 2, height - margin * 2)
    .stroke();

  // Inner gold border
  doc
    .lineWidth(1.5)
    .strokeColor(GOLD)
    .rect(margin + 14, margin + 14, width - (margin + 14) * 2, height - (margin + 14) * 2)
    .stroke();

  const centerX = width / 2;
  let y = margin + 60;

  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(12)
    .text("Quantiva", 0, y, { align: "center", characterSpacing: 3 });

  y += 34;
  doc
    .fillColor(NAVY)
    .font("Times-Bold")
    .fontSize(38)
    .text("Certificate of Completion", 0, y, { align: "center" });

  y += 66;
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(13)
    .text("This certifies that", 0, y, { align: "center" });

  y += 30;
  doc
    .fillColor(NAVY)
    .font("Times-BoldItalic")
    .fontSize(30)
    .text(certificate.userName, 0, y, { align: "center" });

  // Underline beneath the name
  const nameWidth = doc.widthOfString(certificate.userName);
  doc
    .moveTo(centerX - nameWidth / 2 - 10, y + 40)
    .lineTo(centerX + nameWidth / 2 + 10, y + 40)
    .lineWidth(1)
    .strokeColor(GOLD)
    .stroke();

  y += 62;
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(13)
    .text("has successfully completed the course", 0, y, { align: "center" });

  y += 26;
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text(certificate.courseTitle, 60, y, { align: "center", width: width - 120 });

  // Footer: seal + signature blocks
  const footerY = height - margin - 90;

  // Left: issued date
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(new Date(certificate.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin + 70, footerY, { width: 180, align: "center" });
  doc.moveTo(margin + 70, footerY - 6).lineTo(margin + 250, footerY - 6).lineWidth(0.75).strokeColor(MUTED).stroke();
  doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Date Issued", margin + 70, footerY + 16, { width: 180, align: "center" });

  // Center: seal
  const sealX = centerX;
  const sealY = footerY - 10;
  doc.circle(sealX, sealY, 34).lineWidth(2).strokeColor(GOLD).stroke();
  doc.circle(sealX, sealY, 28).lineWidth(0.75).strokeColor(GOLD).stroke();
  doc.fillColor(NAVY).font("Times-Bold").fontSize(16).text("QSL", sealX - 34, sealY - 10, { width: 68, align: "center" });

  // Right: instructor
  doc
    .fillColor(NAVY)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(certificate.instructor, width - margin - 250, footerY, { width: 180, align: "center" });
  doc.moveTo(width - margin - 250, footerY - 6).lineTo(width - margin - 70, footerY - 6).lineWidth(0.75).strokeColor(MUTED).stroke();
  doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Instructor", width - margin - 250, footerY + 16, { width: 180, align: "center" });

  // Certificate ID footer
  const frontendUrl = process.env.FRONTEND_URL || "https://quantiva-deployed.vercel.app/";
  doc
    .fillColor(MUTED)
    .font("Helvetica")
    .fontSize(8)
    .text(`Certificate ID: ${certificate.certificateId}  -  Verify at ${frontendUrl}/verify/${certificate.certificateId}`, 0, height - margin - 20, {
      align: "center",
    });
}

module.exports = {
  issueCertificateIfEligible,
  getMyCertificates,
  getCertificateForCourse,
  verifyCertificate,
  downloadCertificate,
};
