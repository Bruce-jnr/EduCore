import{z}from'zod';const envelope=body=>z.object({body,query:z.any(),params:z.any()});
export const createUserSchema=envelope(z.object({firstName:z.string().trim().min(1).max(80),lastName:z.string().trim().min(1).max(80),email:z.email().transform(x=>x.toLowerCase()),phone:z.string().trim().max(30).optional(),password:z.string().min(8).max(128),roleIds:z.array(z.string().min(1)).min(1)}));
export const updateUserRolesSchema=z.object({body:z.object({roleIds:z.array(z.string().min(1)).min(1)}),query:z.any(),params:z.object({id:z.string().min(1)})});
export const createRoleSchema=envelope(z.object({name:z.string().trim().min(2).max(80),description:z.string().trim().max(250).optional(),permissionIds:z.array(z.string().min(1)).min(1)}));
