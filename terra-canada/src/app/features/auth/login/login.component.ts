import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading: boolean = false;
  errorMessage: string = '';
  showPassword: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = this.translationService.translate('loginCamposInvalidos');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        const user = response.user;
        const role = (user?.rol_nombre || user?.role || '').toLowerCase();

        if (role === 'administrador') {
          this.router.navigate(['/dashboard']);
        } else if (role === 'equipo') {
          this.router.navigate(['/equipo-tarjetas']);
        } else {
          const modules = this.authService.getAccessibleModules();
          const defaultModule = modules[0] || 'login';
          this.router.navigate([`/${defaultModule}`]);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.translationService.translate('loginCredencialesInvalidas');
      }
    });
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
