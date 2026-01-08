import { Request, Response } from 'express';
import proveedorService from '../services/ProveedorService';
import eventoService from '../services/EventoService';
import { TipoEvento, AccionEvento } from '../models/Evento';
import { AuthRequest } from '../middleware/authMiddleware';
import { ApiResponse } from '../types';

export class ProveedorController {
  /**
   * Crear nuevo proveedor
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const payload = req.body;

      const result = await proveedorService.create(payload);

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error creando proveedor' };
      }

      if (result.success && result.data) {
        try {
          const usuarioId = req.user?.id;
          const proveedor: any = result.data as any;
          const entidadId = proveedor?.id ? Number(proveedor.id) : undefined;

          await eventoService.registrarEvento({
            usuario_id: usuarioId,
            tipo_evento: TipoEvento.ACCION,
            accion: AccionEvento.CREAR,
            tipo_entidad: 'PROVEEDOR',
            entidad_id: entidadId,
            descripcion: `Proveedor creado: ${proveedor?.nombre ?? ''} (id=${entidadId ?? 'N/A'})`,
            direccion_ip: (req.headers['x-forwarded-for'] as string) || req.ip,
            agente_usuario: req.headers['user-agent'] as string
          });
        } catch (error) {
          console.error('Error registrando evento de creación de proveedor:', error);
        }
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error creando proveedor' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtener todos los proveedores
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query;

      const result = await proveedorService.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      });

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error obteniendo proveedores' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error obteniendo proveedores' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtener proveedor por ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await proveedorService.getById(id);

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Proveedor no encontrado' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error obteniendo proveedor' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Actualizar proveedor
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payload = req.body;

      const result = await proveedorService.update(id, payload);

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error actualizando proveedor' };
      }
      if (result.success) {
        try {
          const usuarioId = req.user?.id;
          const entidadId = Number(id);
          const proveedor: any = result.data as any;

          await eventoService.registrarEvento({
            usuario_id: usuarioId,
            tipo_evento: TipoEvento.ACCION,
            accion: AccionEvento.ACTUALIZAR,
            tipo_entidad: 'PROVEEDOR',
            entidad_id: entidadId,
            descripcion: `Proveedor actualizado: ${proveedor?.nombre ?? ''} (id=${entidadId})`,
            direccion_ip: (req.headers['x-forwarded-for'] as string) || req.ip,
            agente_usuario: req.headers['user-agent'] as string
          });
        } catch (error) {
          console.error('Error registrando evento de actualización de proveedor:', error);
        }
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error actualizando proveedor' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Eliminar proveedor (soft delete)
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await proveedorService.desactivar(id);

      const response: ApiResponse = {
        success: result.success,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error eliminando proveedor' };
      }
      if (result.success) {
        try {
          const usuarioId = req.user?.id;
          const entidadId = Number(id);

          await eventoService.registrarEvento({
            usuario_id: usuarioId,
            tipo_evento: TipoEvento.ACCION,
            accion: AccionEvento.ELIMINAR,
            tipo_entidad: 'PROVEEDOR',
            entidad_id: entidadId,
            descripcion: `Proveedor eliminado (id=${entidadId})`,
            direccion_ip: (req.headers['x-forwarded-for'] as string) || req.ip,
            agente_usuario: req.headers['user-agent'] as string
          });
        } catch (error) {
          console.error('Error registrando evento de eliminación de proveedor:', error);
        }
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error eliminando proveedor' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Buscar proveedores
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { termino, page, limit } = req.query;

      if (!termino) {
        res.status(400).json({
          success: false,
          error: { message: 'Término de búsqueda requerido' },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await proveedorService.search(termino as string, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      });

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error buscando proveedores' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error buscando proveedores' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtener proveedores por servicio
   */
  async getByServicio(req: Request, res: Response): Promise<void> {
    try {
      const { servicio, page, limit } = req.query;

      if (!servicio) {
        res.status(400).json({
          success: false,
          error: { message: 'Servicio requerido' },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await proveedorService.getByServicio(servicio as string, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      });

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error obteniendo proveedores' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error obteniendo proveedores' },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new ProveedorController();
