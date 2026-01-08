import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProveedorService, Proveedor } from '../../../../core/services/proveedor.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PaginatedTableComponent, TableColumn, RowAction, ActionEvent } from '../../../../shared/components/paginated-table';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-entidades-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginatedTableComponent, TranslatePipe],
  templateUrl: './entidades-proveedores.component.html',
  styleUrl: './entidades-proveedores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntidadesProveedoresComponent implements OnInit, OnDestroy {
  proveedores: Proveedor[] = [];
  filteredProveedores: Proveedor[] = [];
  searchTerm = '';
  isLoading = false;
  errorMessage: string | null = null;

  showCreateModal = false;
  showEditModal = false;
  showViewModal = false;
  showDeleteConfirm = false;

  createForm!: FormGroup;
  editForm!: FormGroup;
  selectedProveedor: Proveedor | null = null;
  proveedorAEliminar: Proveedor | null = null;

  // Configuración de tabla paginada
  columns: TableColumn[] = [
    {
      key: 'nombre',
      label: 'nombre',
      type: 'text',
      width: '220px'
    },
    {
      key: 'servicio',
      label: 'servicio',
      type: 'text',
      width: '220px',
      formatter: (value, row) => (row.servicio || 'N/A')
    },
    {
      key: 'telefono',
      label: 'telefonos',
      type: 'text',
      width: '200px',
      formatter: (value, row) => {
        const phones = [row.telefono, row.telefono2].filter((p: string | undefined) => !!p);
        return phones.length ? phones.join(' / ') : 'N/A';
      }
    },
    {
      key: 'correo',
      label: 'correos',
      type: 'text',
      width: '260px',
      formatter: (value, row) => {
        const emails = [row.correo, row.correo2].filter((c: string | undefined) => !!c);
        return emails.length ? emails.join(' / ') : 'N/A';
      }
    }
  ];

  actions: RowAction[] = [];

  isAdmin = false;
  isSupervisor = false;
  isEquipo = false;

  private destroy$ = new Subject<void>();

  constructor(
    private proveedorService: ProveedorService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.isSupervisor = this.authService.hasRole('supervisor');
    this.isEquipo = this.authService.isEquipo();

    this.initForms();
    this.configureActionsByRole();
    this.loadProveedores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.createForm = this.fb.group({
      nombre: ['', Validators.required],
      servicio: ['', Validators.required],
      telefono: ['', [Validators.pattern(/^[0-9]{6,20}$/)]],
      telefono2: ['', [Validators.pattern(/^[0-9]{6,20}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      correo2: ['', Validators.email],
      descripcion: ['']
    });

    this.editForm = this.fb.group({
      nombre: ['', Validators.required],
      servicio: ['', Validators.required],
      telefono: ['', [Validators.pattern(/^[0-9]{6,20}$/)]],
      telefono2: ['', [Validators.pattern(/^[0-9]{6,20}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      correo2: ['', Validators.email],
      descripcion: ['']
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

  private loadProveedores(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.proveedorService.proveedores$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (proveedores) => {
          const lista = proveedores || [];
          // Orden descendente: el registro más reciente primero
          this.proveedores = [...lista].sort((a, b) => {
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
          console.error('Error cargando proveedores:', error);
          this.proveedores = [];
          this.filteredProveedores = [];
          this.errorMessage = 'Error al cargar proveedores';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });

    this.proveedorService.cargarProveedores();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  private applyFilter(): void {
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.filteredProveedores = [...this.proveedores];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredProveedores = this.proveedores.filter((p) => {
      return (
        (p.nombre || '').toLowerCase().includes(term) ||
        (p.servicio || '').toLowerCase().includes(term) ||
        (p.telefono || '').toLowerCase().includes(term) ||
        (p.telefono2 || '').toLowerCase().includes(term) ||
        (p.correo || '').toLowerCase().includes(term) ||
        (p.correo2 || '').toLowerCase().includes(term)
      );
    });
  }

  canCreateOrEdit(): boolean {
    return this.isAdmin || this.isSupervisor;
  }

  onTableAction(event: ActionEvent): void {
    const proveedor = event.row as Proveedor;

    switch (event.action) {
      case 'view':
        this.openViewModal(proveedor);
        break;
      case 'edit':
        this.openEditModal(proveedor);
        break;
      case 'delete':
        this.openDeleteConfirm(proveedor);
        break;
    }
  }

  openCreateModal(): void {
    if (!this.canCreateOrEdit()) {
      return;
    }
    this.createForm.reset({
      nombre: '',
      servicio: '',
      telefono: '',
      telefono2: '',
      correo: '',
      correo2: '',
      descripcion: ''
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

    const payload = this.createForm.value as Proveedor;

    this.proveedorService.create(payload).subscribe({
      next: () => {
        this.notificationService.success('✅ Proveedor creado correctamente');
        this.showCreateModal = false;
      },
      error: (error) => {
        console.error('Error creando proveedor:', error);
        this.notificationService.error('❌ Error al crear el proveedor');
      }
    });
  }

  openEditModal(proveedor: Proveedor): void {
    if (!this.canCreateOrEdit()) {
      return;
    }
    this.selectedProveedor = proveedor;
    this.editForm.patchValue({
      nombre: proveedor.nombre,
      servicio: proveedor.servicio || '',
      telefono: proveedor.telefono || '',
      telefono2: proveedor.telefono2 || '',
      correo: proveedor.correo || '',
      correo2: proveedor.correo2 || '',
      descripcion: proveedor.descripcion || ''
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedProveedor = null;
  }

  submitEdit(): void {
    if (!this.selectedProveedor || !this.editForm.valid) {
      return;
    }

    const payload = this.editForm.value as Partial<Proveedor>;

    this.proveedorService.update(this.selectedProveedor.id!, payload).subscribe({
      next: () => {
        this.notificationService.success('✅ Proveedor actualizado correctamente');
        this.showEditModal = false;
        this.selectedProveedor = null;
      },
      error: (error) => {
        console.error('Error actualizando proveedor:', error);
        this.notificationService.error('❌ Error al actualizar el proveedor');
      }
    });
  }

  openViewModal(proveedor: Proveedor): void {
    this.selectedProveedor = proveedor;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedProveedor = null;
  }

  openDeleteConfirm(proveedor: Proveedor): void {
    if (!this.isAdmin) {
      return;
    }
    this.proveedorAEliminar = proveedor;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.proveedorAEliminar = null;
  }

  confirmDelete(): void {
    if (!this.proveedorAEliminar || !this.isAdmin) {
      return;
    }

    this.proveedorService.delete(this.proveedorAEliminar.id!).subscribe({
      next: () => {
        this.notificationService.success('✅ Proveedor eliminado correctamente');
        this.showDeleteConfirm = false;
        this.proveedorAEliminar = null;
      },
      error: (error) => {
        console.error('Error eliminando proveedor:', error);
        this.notificationService.error('❌ Error al eliminar el proveedor');
      }
    });
  }

  onTelefonoInput(formType: 'create' | 'edit', controlName: 'telefono' | 'telefono2', event: Event): void {
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
