import client, { collectDefaultMetrics } from 'prom-client';

export const register = new client.Registry();

collectDefaultMetrics({ register });

/** Contador de notificaciones enviadas por tipo */
export const notificationsSentTotal = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total de notificaciones enviadas',
  labelNames: ['type'] as const,
});

/** Gauge de notificaciones pendientes (no leídas) */
export const notificationsPending = new client.Gauge({
  name: 'notifications_pending',
  help: 'Cantidad de notificaciones pendientes (no leídas)',
});

/** Gauge del estado de conexiones externas */
export const connectionStatus = new client.Gauge({
  name: 'connection_status',
  help: 'Estado de conexiones externas (1=conectado, 0=desconectado)',
  labelNames: ['service'] as const,
});

register.registerMetric(notificationsSentTotal);
register.registerMetric(notificationsPending);
register.registerMetric(connectionStatus);
