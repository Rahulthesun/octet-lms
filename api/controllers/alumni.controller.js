/**
 * controllers/alumni.controller.js
 * Thin HTTP wrappers around services/alumni.service.js. Admin only.
 */

const alumniService = require("../services/alumni.service");

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

exports.list = handle((req) => {
  const { search, batch, year, limit, offset } = req.query;
  return alumniService.listAlumni({ search, batch, year, limit, offset });
});

exports.filters = handle(() => alumniService.getAlumniFilters());

exports.get = handle((req) => alumniService.getAlumnus(req.params.id));

exports.restore = handle((req) => alumniService.restoreAlumnus(req.params.id, req.user.id));

exports.runArchive = handle(async () => {
  const results = await alumniService.archiveDueStudents();
  return { processed: results.length, results };
});

exports.setGraduationDate = handle((req) =>
  alumniService.setGraduationDate(req.params.id, req.body.graduationDate || null, req.user.id)
);

exports.bulkGraduationDate = handle((req) =>
  alumniService.bulkSetGraduationDate(
    { batchId: req.body.batchId, studentIds: req.body.studentIds, graduationDate: req.body.graduationDate },
    req.user.id
  )
);
