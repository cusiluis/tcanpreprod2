import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TopHeaderComponent } from '../../shared/components/top-header/top-header';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { NotificationComponent, Notification } from '../../shared/components/notification/notification.component';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-entidades',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopHeaderComponent, NotificationComponent, TranslatePipe],
  templateUrl: './entidades.html',
  styleUrl: './entidades.scss'
})
export class EntidadesComponent implements OnInit {
  notifications: Notification[] = [];

  constructor(public notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.notifications$.subscribe((notifications) => {
      this.notifications = notifications;
    });
  }
}
