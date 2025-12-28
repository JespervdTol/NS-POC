type Listener<T> = (payload: T) => void;

export class NotificationBus<T> {
  private listeners = new Set<Listener<T>>();

  subscribe(listener: Listener<T>) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(payload: T) {
    for (const l of this.listeners) l(payload);
  }
}