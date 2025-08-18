// pages/api/users/[id]/role.ts
import type { NextApiResponse } from 'next';
import type { AuthedReq } from '@/lib/secure';
import { withRole } from '@/lib/secure';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const roleSchema = z.object({ role: z.enum(['ADMIN', 'USER']) });
//SI SE DESEA PASAR DE USER A ADMIN, SE DEBE HACER CON:
//  export default withRole("USER", async (req: AuthedReq, res: NextApiResponse) => {
export default withRole(
  'USER',
  async (req: AuthedReq, res: NextApiResponse) => {
    const { id } = req.query as { id: string };

    try {
      if (req.method !== 'PUT' && req.method !== 'POST') {
        res.setHeader('Allow', 'PUT, POST');
        return res.status(405).end();
      }

      // Evita 304 / caching intermedio
      res.setHeader('Cache-Control', 'no-store');

      // Usuario objetivo
      const current = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });
      if (!current) return res.status(404).json({ error: 'Not found' });

      // Determinar nextRole
      let nextRole: 'ADMIN' | 'USER';
      if (req.method === 'PUT') {
        const parsed = roleSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: parsed.error.flatten() });
        }
        nextRole = parsed.data.role;
      } else {
        // POST = toggle
        nextRole = current.role === 'ADMIN' ? 'USER' : 'ADMIN';
      }

      // No dejar el sistema sin administradores
      if (current.role === 'ADMIN' && nextRole === 'USER') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN' },
        });
        if (adminCount <= 1) {
          return res.status(409).json({
            error: 'No puedes dejar la organización sin administradores.',
          });
        }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role: nextRole },
        select: { id: true, role: true },
      });

      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('[API] /api/users/[id]/role', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);
