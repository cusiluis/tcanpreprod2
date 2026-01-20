import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClienteService, Cliente } from '../../../../core/services/cliente.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginatedTableComponent, TableColumn, RowAction, ActionEvent } from '../../../../shared/components/paginated-table';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-entidades-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginatedTableComponent, TranslatePipe],
  templateUrl: './entidades-clientes.component.html',
  styleUrl: './entidades-clientes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntidadesClientesComponent implements OnInit, OnDestroy {
  clientes: Cliente[] = [];
  filteredClientes: Cliente[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage: string | null = null;

  showCreateModal = false;
  showEditModal = false;
  showViewModal = false;
  showDeleteConfirm = false;

  createForm!: FormGroup;
  editForm!: FormGroup;
  selectedCliente: Cliente | null = null;
  clienteAEliminar: Cliente | null = null;

  // Configuración de tabla paginada
  columns: TableColumn[] = [
    {
      key: 'nombre',
      label: 'nombre',
      type: 'text',
      width: '220px'
    },
    {
      key: 'ubicacion',
      label: 'ubicacion',
      type: 'text',
      width: '220px',
      formatter: (value, row) => (row.ubicacion || 'N/A')
    },
    {
      key: 'telefono',
      label: 'telefono',
      type: 'text',
      width: '150px',
      formatter: (value, row) => (row.telefono || 'N/A')
    },
    {
      key: 'correo',
      label: 'correo',
      type: 'text',
      width: '240px',
      formatter: (value, row) => (row.correo || 'N/A')
    }
  ];

  actions: RowAction[] = [];

  isAdmin = false;
  isSupervisor = false;
  isEquipo = false;

  private destroy$ = new Subject<void>();

  constructor(
    private clienteService: ClienteService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.isSupervisor = this.authService.hasRole('supervisor');
    this.isEquipo = this.authService.isEquipo();

    this.configureActionsByRole();
    this.initForms();
    this.loadClientes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.createForm = this.fb.group({
      nombre: ['', Validators.required],
      ubicacion: [''],
      telefono: ['', [Validators.pattern(/^[0-9]{6,20}$/)]],
      correo: ['', Validators.email]
    });

    this.editForm = this.fb.group({
      nombre: ['', Validators.required],
      ubicacion: [''],
      telefono: ['', [Validators.pattern(/^[0-9]{6,20}$/)]],
      correo: ['', Validators.email]
    });
  }

  private configureActionsByRole(): void {
    const baseActions: RowAction[] = [
      {
        id: 'view',
        label: 'ver',
        icon: 'pi pi-eye',
        class: 'view-btn'
      }
    ];

    if (this.isAdmin || this.isSupervisor) {
      baseActions.push({
        id: 'edit',
        label: 'editar',
        icon: 'pi pi-pencil',
        class: 'edit-btn'
      });
    }

    if (this.isAdmin) {
      baseActions.push({
        id: 'delete',
        label: 'eliminar',
        icon: 'pi pi-trash',
        class: 'delete-btn'
      });
    }

    this.actions = baseActions;
  }

  private loadClientes(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.clienteService.clientes$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clientes) => {
          const lista = clientes || [];
          // Orden descendente: el registro más reciente primero
          this.clientes = [...lista].sort((a, b) => {
            const fechaA = a.fecha_creacion ? new Date(a.fecha_creacion).getTime() : 0;
            const fechaB = b.fecha_creacion ? new Date(b.fecha_creacion).getTime() : 0;

            if (fechaA !== fechaB) {
              return fechaB - fechaA;
            }

            if (a.id != null && b.id != null) {
              return b.id - a.id;
            }

            return 0;
          });
          this.applyFilter();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error cargando clientes:', error);
          this.clientes = [];
          this.filteredClientes = [];
          this.errorMessage = 'Error al cargar clientes';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });

    this.clienteService.cargarClientes();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.filteredClientes = [...this.clientes];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredClientes = this.clientes.filter((c) => {
      return (
        (c.nombre || '').toLowerCase().includes(term) ||
        (c.ubicacion || '').toLowerCase().includes(term) ||
        (c.telefono || '').toLowerCase().includes(term) ||
        (c.correo || '').toLowerCase().includes(term)
      );
    });
  }

  canCreateOrEdit(): boolean {
    return this.isAdmin || this.isSupervisor;
  }

  onTableAction(event: ActionEvent): void {
    const cliente = event.row as Cliente;

    switch (event.action) {
      case 'view':
        this.openViewModal(cliente);
        break;
      case 'edit':
        this.openEditModal(cliente);
        break;
      case 'delete':
        this.openDeleteConfirm(cliente);
        break;
    }
  }

  openCreateModal(): void {
    if (!this.canCreateOrEdit()) {
      return;
    }
    this.createForm.reset({
      nombre: '',
      ubicacion: '',
      telefono: '',
      correo: ''
    });
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
    this.createForm.updateValueAndValidity({ emitEvent: false });
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitCreate(): void {
    if (!this.createForm.valid) {
      return;
    }

    const payload = this.createForm.value as Cliente;

    this.clienteService.create(payload).subscribe({
      next: () => {
        this.notificationService.success('✅ Cliente creado correctamente');
        this.showCreateModal = false;
      },
      error: (error) => {
        console.error('Error creando cliente:', error);
        this.notificationService.error('❌ Error al crear el cliente');
      }
    });
  }

  openEditModal(cliente: Cliente): void {
    if (!this.canCreateOrEdit()) {
      return;
    }
    this.selectedCliente = cliente;
    this.editForm.patchValue({
      nombre: cliente.nombre,
      ubicacion: cliente.ubicacion || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || ''
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedCliente = null;
  }

  submitEdit(): void {
    if (!this.selectedCliente || !this.editForm.valid) {
      return;
    }

    const payload = this.editForm.value as Partial<Cliente>;

    this.clienteService.update(this.selectedCliente.id!, payload).subscribe({
      next: () => {
        this.notificationService.success('✅ Cliente actualizado correctamente');
        this.showEditModal = false;
        this.selectedCliente = null;
      },
      error: (error) => {
        console.error('Error actualizando cliente:', error);
        this.notificationService.error('❌ Error al actualizar el cliente');
      }
    });
  }

  openViewModal(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedCliente = null;
  }

  openDeleteConfirm(cliente: Cliente): void {
    if (!this.isAdmin) {
      return;
    }
    this.clienteAEliminar = cliente;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.clienteAEliminar = null;
  }

  confirmDelete(): void {
    if (!this.clienteAEliminar || !this.isAdmin) {
      return;
    }

    this.clienteService.delete(this.clienteAEliminar.id!).subscribe({
      next: () => {
        this.notificationService.success('✅ Cliente eliminado correctamente');
        this.showDeleteConfirm = false;
        this.clienteAEliminar = null;
      },
      error: (error) => {
        console.error('Error eliminando cliente:', error);
        this.notificationService.error('❌ Error al eliminar el cliente');
      }
    });
  }

  onTelefonoInput(formType: 'create' | 'edit', controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/[^0-9]/g, '');
    if (digitsOnly !== input.value) {
      input.value = digitsOnly;
    }

    const form = formType === 'create' ? this.createForm : this.editForm;
    const control = form.get(controlName);
    if (control) {
      control.setValue(digitsOnly);
    }
  }
}
