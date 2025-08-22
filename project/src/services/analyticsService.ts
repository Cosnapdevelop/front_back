import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: any;
}

interface AlertConfig {
  metric: string;
  threshold: number;
  comparator: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high';
}

class AnalyticsService {
  private socket: Socket | null = null;
  private events: AnalyticsEvent[] = [];
  private alerts: AlertConfig[] = [];

  constructor() {
    this.initializeSocketConnection();
    this.setupDefaultAlerts();
  }

  private initializeSocketConnection() {
    this.socket = io(process.env.REACT_APP_ANALYTICS_SOCKET_URL || 'http://localhost:3001');

    this.socket.on('connect', () => {
      console.log('Connected to analytics streaming service');
    });

    this.socket.on('analyticsEvent', (event: AnalyticsEvent) => {
      this.processEvent(event);
    });
  }

  private setupDefaultAlerts() {
    this.alerts = [
      {
        metric: 'activeUsers',
        threshold: 50,
        comparator: 'gt',
        severity: 'medium'
      },
      {
        metric: 'conversionRate',
        threshold: 0.1,
        comparator: 'lt',
        severity: 'high'
      }
    ];
  }

  private processEvent(event: AnalyticsEvent) {
    this.events.push(event);
    this.checkAlerts(event);
  }

  private checkAlerts(event: AnalyticsEvent) {
    this.alerts.forEach(alert => {
      const metricValue = event.data[alert.metric];
      if (metricValue !== undefined) {
        let triggerAlert = false;
        switch (alert.comparator) {
          case 'gt':
            triggerAlert = metricValue > alert.threshold;
            break;
          case 'lt':
            triggerAlert = metricValue < alert.threshold;
            break;
          case 'eq':
            triggerAlert = metricValue === alert.threshold;
            break;
        }

        if (triggerAlert) {
          this.raiseAlert(alert, metricValue);
        }
      }
    });
  }

  private raiseAlert(alert: AlertConfig, currentValue: number) {
    // In a real implementation, this would trigger notifications
    console.warn(`ALERT: ${alert.metric} ${alert.comparator} ${alert.threshold}. Current value: ${currentValue}`);
  }

  public useRealtimeAnalytics() {
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);

    useEffect(() => {
      const handleEvent = (event: AnalyticsEvent) => {
        setEvents(prev => [...prev, event]);
      };

      if (this.socket) {
        this.socket.on('analyticsEvent', handleEvent);
      }

      return () => {
        if (this.socket) {
          this.socket.off('analyticsEvent', handleEvent);
        }
      };
    }, []);

    return events;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new AnalyticsService();