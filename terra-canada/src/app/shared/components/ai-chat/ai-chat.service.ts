import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';
import { TranslationKey } from '../../models/translations.model';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private messagesSubject: BehaviorSubject<ChatMessage[]>;

  private readonly botResponseKeys: TranslationKey[] = [
    'aiChatResponse1',
    'aiChatResponse2',
    'aiChatResponse3',
    'aiChatResponse4'
  ];

  constructor(private translationService: TranslationService) {
    this.messagesSubject = new BehaviorSubject<ChatMessage[]>([this.createWelcomeMessage()]);
  }

  public get messages$(): Observable<ChatMessage[]> {
    return this.messagesSubject.asObservable();
  }

  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  addMessage(text: string, sender: 'user' | 'bot'): void {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, newMessage]);

    // Simular respuesta del bot después de 1 segundo
    if (sender === 'user') {
      setTimeout(() => {
        this.addBotResponse();
      }, 1000);
    }
  }

  private addBotResponse(): void {
    const randomKey =
      this.botResponseKeys[Math.floor(Math.random() * this.botResponseKeys.length)];
    const randomResponse = this.translationService.translate(randomKey);
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: randomResponse,
      sender: 'bot',
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, newMessage]);
  }

  clearMessages(): void {
    this.messagesSubject.next([this.createWelcomeMessage()]);
  }

  private createWelcomeMessage(): ChatMessage {
    return {
      id: '1',
      text: this.translationService.translate('aiChatWelcome'),
      sender: 'bot',
      timestamp: new Date()
    };
  }
}
