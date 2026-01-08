import { Request, Response } from 'express';
import clienteService from '../services/ClienteService';
import eventoService from '../services/EventoService';
import { TipoEvento, AccionEvento } from '../models/Evento';
import { AuthRequest } from '../middleware/authMiddleware';
import { ApiResponse } from '../types';

export class ClienteController {
  /**
   * Crear nuevo cliente
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const payload = req.body;

      const result = await clienteService.create(payload);

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error creando cliente' };
      }

      if (result.success && result.data) {
        try {
          const usuarioId = req.user?.id;
          const cliente: any = result.data as any;
          const entidadId = cliente?.id ? Number(cliente.id) : undefined;

          await eventoService.registrarEvento({
            usuario_id: usuarioId,
            tipo_evento: TipoEvento.ACCION,
            accion: AccionEvento.CREAR,
            tipo_entidad: 'CLIENTE',
            entidad_id: entidadId,
            descripcion: `Cliente creado: ${cliente?.nombre ?? ''} (id=${entidadId ?? 'N/A'})`,
            direccion_ip: (req.headers['x-forwarded-for'] as string) || req.ip,
            agente_usuario: req.headers['user-agent'] as string
          });
        } catch (error) {
          console.error('Error registrando evento de creación de cliente:', error);
        }
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error creando cliente' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtener todos los clientes
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit } = req.query;

      const result = await clienteService.getAll({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      });

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error obteniendo clientes' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error obteniendo clientes' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtener cliente por ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await clienteService.getById(id);

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Cliente no encontrado' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error obteniendo cliente' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Actualizar cliente
   */
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payload = req.body;

      const result = await clienteService.update(id, payload);

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error actualizando cliente' };
      }
      if (result.success) {
        try {
          const usuarioId = req.user?.id;
          const entidadId = Number(id);
          const cliente: any = result.data as any;

          await eventoService.registrarEvento({
            usuario_id: usuarioId,
            tipo_evento: TipoEvento.ACCION,
            accion: AccionEvento.ACTUALIZAR,
            tipo_entidad: 'CLIENTE',
            entidad_id: entidadId,
            descripcion: `Cliente actualizado: ${cliente?.nombre ?? ''} (id=${entidadId})`,
            direccion_ip: (req.headers['x-forwarded-for'] as string) || req.ip,
            agente_usuario: req.headers['user-agent'] as string
          });
        } catch (error) {
          console.error('Error registrando evento de actualización de cliente:', error);
        }
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error actualizando cliente' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Eliminar cliente (soft delete)
   */
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await clienteService.desactivar(id);

      const response: ApiResponse = {
        success: result.success,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error eliminando cliente' };
      }
      if (result.success) {
        try {
          const usuarioId = req.user?.id;
          const entidadId = Number(id);

          await eventoService.registrarEvento({
            usuario_id: usuarioId,
            tipo_evento: TipoEvento.ACCION,
            accion: AccionEvento.ELIMINAR,
            tipo_entidad: 'CLIENTE',
            entidad_id: entidadId,
            descripcion: `Cliente eliminado (id=${entidadId})`,
            direccion_ip: (req.headers['x-forwarded-for'] as string) || req.ip,
            agente_usuario: req.headers['user-agent'] as string
          });
        } catch (error) {
          console.error('Error registrando evento de eliminación de cliente:', error);
        }
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error eliminando cliente' },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Buscar clientes
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

      const result = await clienteService.search(termino as string, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      });

      const response: ApiResponse = {
        success: result.success,
        data: result.data,
        timestamp: new Date().toISOString()
      };

      if (!result.success) {
        response.error = { message: result.error || 'Error buscando clientes' };
      }

      res.status(result.statusCode).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: error instanceof Error ? error.message : 'Error buscando clientes' },
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default new ClienteController();
