import { staffService } from './staff.service.js';
export async function listStaff(req,res){res.json({success:true,data:await staffService.list(req.auth.tenantId,req.validated.query),message:null})}
export async function createStaff(req,res){res.status(201).json({success:true,data:await staffService.create(req.auth,req.validated.body),message:'Staff member created'})}
export async function listAssignments(req,res){res.json({success:true,data:await staffService.assignments(req.auth.tenantId),message:null})}
export async function createAssignment(req,res){res.status(201).json({success:true,data:await staffService.assign(req.auth,req.validated.body),message:'Teacher assigned'})}
