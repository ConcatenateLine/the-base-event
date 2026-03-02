/**
 * Client mount waiting mechanism for SSR/CSR
 * @author The Base Event Team
 * @since 1.0.0
 */

const DEFAULT_TIMEOUT = 5000;

export class ClientWaitManager {
  private mountResolve: (() => void) | null = null;
  private mountPromise: Promise<void>;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private timeout: number;
  private isMounted = false;

  constructor(timeout = DEFAULT_TIMEOUT) {
    this.timeout = timeout;
    this.mountPromise = new Promise(resolve => {
      this.mountResolve = resolve;
    });
  }

  onClientMount(): void {
    if (this.isMounted) return;

    this.isMounted = true;
    this.clearTimeout();
    this.mountResolve?.();
  }

  waitForClient(timeout?: number): Promise<void> {
    if (this.isMounted) return Promise.resolve();

    const effectiveTimeout = timeout ?? this.timeout;

    if (effectiveTimeout > 0) {
      this.timeoutId = setTimeout(() => {
        console.warn(
          "[TheBaseEvent] Hydration timeout, replaying buffered events"
        );
        this.onClientMount();
      }, effectiveTimeout);
    }

    return this.mountPromise;
  }

  isClientMounted(): boolean {
    return this.isMounted;
  }

  getTimeout(): number {
    return this.timeout;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  reset(): void {
    this.isMounted = false;
    this.clearTimeout();
    this.mountPromise = new Promise(resolve => {
      this.mountResolve = resolve;
    });
  }

  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
