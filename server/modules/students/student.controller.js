import { studentService } from './student.service.js';
export async function listStudents(req, res) { res.json({ success: true, data: await studentService.list(req.auth.tenantId, req.validated.query), message: null }); }
export async function getStudent(req, res) { res.json({ success: true, data: await studentService.get(req.auth.tenantId, req.validated.params.id), message: null }); }
export async function createStudent(req, res) { res.status(201).json({ success: true, data: await studentService.create(req.auth, req.validated.body), message: 'Student created' }); }
export async function updateStudent(req, res) { res.json({ success: true, data: await studentService.update(req.auth, req.validated.params.id, req.validated.body), message: 'Student updated' }); }
