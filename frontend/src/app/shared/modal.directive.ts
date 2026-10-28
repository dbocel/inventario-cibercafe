import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';

/** Conserva la capa modal nativa, Escape y el foco del control que la abrió. */
@Directive({ selector: 'dialog[appModal]' })
export class ModalDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private readonly opener = document.activeElement;
  @Input() modalBusy = false;
  @Output() readonly dismissed = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.element.showModal();
    this.element.querySelector<HTMLElement>('[autofocus]')?.focus();
  }

  @HostListener('cancel', ['$event'])
  cancel(event: Event): void {
    event.preventDefault();
    if (!this.modalBusy) this.dismissed.emit();
  }

  ngOnDestroy(): void {
    this.element.close();
    if (this.opener instanceof HTMLElement && this.opener.isConnected) this.opener.focus();
  }
}
