import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type SignalCallback = (payload: any) => void;

export class LiveFeedClient {
  private channel: RealtimeChannel | null = null;
  private callbacks: Set<SignalCallback> = new Set();
  private lastProcessedId: string | null = null;

  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  /**
   * Establish the realtime connection and subscribe to INSERT events.
   */
  public connect(): void {
    if (this.channel) return;

    this.channel = this.supabase
      .channel(`anyways-live-feed-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'validation_signals',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          this.handleIncomingSignal(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[LiveFeed] Connection lost. Attempting to reconnect...');
          this.reconnect();
        }
      });
  }

  /**
   * Subscribe to new signals.
   */
  public subscribe(callback: SignalCallback): void {
    this.callbacks.add(callback);
    // Auto-connect if not already connected
    this.connect();
  }

  /**
   * Stop listening and cleanup.
   */
  public unsubscribe(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.callbacks.clear();
  }

  /**
   * Private: Process incoming signals with duplicate prevention.
   */
  private handleIncomingSignal(payload: any): void {
    const signal = payload.new;
    
    // Duplicate prevention (simple ID check)
    if (signal.id === this.lastProcessedId) return;
    this.lastProcessedId = signal.id;

    this.callbacks.forEach((cb) => cb(signal));
  }

  /**
   * Private: Reconnect logic.
   */
  private async reconnect(): Promise<void> {
    this.channel = null;
    // Exponential backoff or simple delay could go here
    setTimeout(() => this.connect(), 3000);
  }
}
