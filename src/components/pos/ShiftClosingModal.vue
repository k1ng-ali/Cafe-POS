<template>
  <div class="shift-closing-backdrop">
    <div id="shift-closing-modal" class="shift-closing-modal">
      <div class="shift-closing-modal__header">
        <div class="shift-closing-modal__title-wrap">
          <div class="shift-closing-modal__icon">
            <Clock class="icon icon--sm" />
          </div>
          <div>
            <h3>Закрытие смены</h3>
            <p>Сотрудник: <span>{{ currentShift?.employeeName }}</span></p>
          </div>
        </div>
        <button type="button" class="close-button" @click="$emit('cancel')"><X class="icon icon--sm" /></button>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><span>Начало</span><strong>{{ formatTime(currentShift?.startTime || '') }}</strong></div>
        <div class="stat-card"><span>Конец</span><strong>{{ formatTime(new Date().toISOString()) }}</strong></div>
        <div class="stat-card"><span>Продаж</span><strong>{{ currentShift?.salesCount || 0 }}</strong></div>
        <div class="stat-card stat-card--accent"><span>Выручка</span><strong>{{ currentShift?.totalRevenue || 0 }} {{ store.settings.currency }}</strong></div>
      </div>

      <div class="payment-breakdown">
        <span class="payment-breakdown__label">Разбивка по способам оплаты:</span>
        <div class="payment-breakdown__grid">
          <div class="payment-box"><span>Наличные</span><strong>{{ currentShift?.paymentBreakdown.cash || 0 }} {{ store.settings.currency }}</strong></div>
          <div class="payment-box"><span>Корти Миллӣ / Карта</span><strong>{{ currentShift?.paymentBreakdown.card || 0 }} {{ store.settings.currency }}</strong></div>
          <div class="payment-box"><span>QR / Эл. кошелёк</span><strong>{{ currentShift?.paymentBreakdown.qr || 0 }} {{ store.settings.currency }}</strong></div>
        </div>
      </div>

      <div class="items-summary">
        <span class="items-summary__label">Проданные товары за смену:</span>
        <div class="items-summary__list">
          <div v-for="item in itemsSummary" :key="item.productId" class="summary-item">
            <span class="summary-item__name">{{ item.name }}</span>
            <span class="summary-item__value"><strong>{{ item.quantity }}</strong> × {{ item.price }} = <em>{{ item.total }} {{ store.settings.currency }}</em></span>
          </div>
          <div v-if="itemsSummary.length === 0" class="empty-summary">В этой смене пока нет завершённых продаж</div>
        </div>
      </div>

      <div class="security-note">
        <ShieldCheck class="icon icon--xs" />
        <div>
          <div class="security-note__title">Криптографическая защита отчёта</div>
          <div>Файл отчёта снабжается цифровой контрольной суммой SHA-256 и уникальным Shift ID:<code>{{ currentShift?.id }}</code></div>
        </div>
      </div>

      <div class="shift-closing-modal__actions">
        <button id="btn-export-and-close-shift" type="button" class="primary-button" @click="handleExportAndClose" :disabled="isExporting">
          <FileDown class="icon icon--sm" />
          <span>Экспортировать отчёт и завершить смену</span>
        </button>

        <div class="double-button-row">
          <button id="btn-copy-report-json" type="button" class="secondary-button" @click="copyReportJson">
            <Copy class="icon icon--xs" />
            <span>Скопировать текст для чата</span>
          </button>
          <button id="btn-close-shift-only" type="button" class="secondary-button" @click="handleCloseOnly">
            <CheckCircle class="icon icon--xs" />
            <span>Завершить без файла</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.shift-closing-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.85);
  overflow-y: auto;
}

.shift-closing-modal {
  width: min(100%, 44rem);
  background: #161a22;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 30px;
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  color: #edf2ff;
  margin: 2rem 0;
}

.shift-closing-modal__header,
.shift-closing-modal__title-wrap,
.payment-breakdown__grid,
.double-button-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shift-closing-modal__header {
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.shift-closing-modal__title-wrap {
  gap: 0.8rem;

  h3 {
    margin: 0;
    color: #fff;
    font-size: 1.1rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: #aab5c6;
    font-size: 0.68rem;
  }

  span { color: #f4c96d; }
}

.shift-closing-modal__icon {
  width: 2.6rem;
  height: 2.6rem;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(244, 201, 109, 0.1);
  border: 1px solid rgba(244, 201, 109, 0.2);
  color: #f4c96d;
}

.close-button {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 12px;
  color: #b6c0d2;
  background: rgba(148, 163, 184, 0.05);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: #1e2430;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 0.75rem;

  span { color: #8c99ad; font-size: 0.62rem; }
  strong { color: #edf2ff; font-size: 0.9rem; }

  &--accent {
    background: rgba(244, 201, 109, 0.08);
    border-color: rgba(244, 201, 109, 0.22);
    strong { color: #f4c96d; }
  }
}

.payment-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #1c222c;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 18px;
  padding: 0.8rem;
}

.payment-breakdown__label,
.items-summary__label {
  display: block;
  color: #dfeafc;
  font-size: 0.7rem;
  font-weight: 700;
}

.payment-breakdown__grid {
  gap: 0.5rem;
  flex-wrap: wrap;

  .payment-box {
    flex: 1 1 0;
    min-width: 0;
    background: rgba(15, 23, 42, 0.55);
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 12px;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    span {
      color: #8b98ad;
      font-size: 0.56rem;
    }

    strong {
      color: #edf2ff;
      font-size: 0.72rem;
    }
  }
}

.items-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.items-summary__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 10.5rem;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.64rem;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  background: rgba(30, 36, 48, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  padding: 0.55rem 0.7rem;
}

.summary-item__name { color: #edf2ff; }
.summary-item__value {
  color: #a5afc6;

  strong { color: #edf2ff; }
  em { color: #f4c96d; font-style: normal; }
}

.empty-summary {
  text-align: center;
  padding: 1rem 0;
  color: #7e8da4;
  font-size: 0.66rem;
}

.security-note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: rgba(30, 64, 175, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.28);
  border-radius: 18px;
  padding: 0.7rem 0.8rem;
  color: #dfeafc;
  font-size: 0.66rem;

  code {
    display: block;
    margin-top: 0.3rem;
    color: #bfdbfe;
    font-size: 0.58rem;
    font-family: 'JetBrains Mono', monospace;
    word-break: break-all;
  }
}

.security-note__title { color: #bfdbfe; font-weight: 700; }

.shift-closing-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.8rem;
  border-radius: 14px;
  font-size: 0.68rem;
  font-weight: 800;
}

.primary-button {
  width: 100%;
  background: #f4c96d;
  border: 1px solid rgba(244, 201, 109, 0.25);
  color: #111827;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.double-button-row {
  gap: 0.6rem;

  .secondary-button {
    flex: 1;
    background: #2a3241;
    border: 1px solid rgba(148, 163, 184, 0.18);
    color: #eaf1ff;
  }
}

.icon { display: inline-block; }
.icon--xs { width: 0.82rem; height: 0.82rem; }
.icon--sm { width: 1rem; height: 1rem; }
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import { Clock, X, ShieldCheck, FileDown, Copy, CheckCircle } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'shift-closed'): void;
}>();

const store = usePosStore();
const currentShift = computed(() => store.activeShift);
const isExporting = ref(false);

const itemsSummary = computed(() => {
  if (!currentShift.value) return [];
  const map = new Map<string, { productId: string; name: string; quantity: number; price: number; total: number }>();

  for (const s of currentShift.value.sales) {
    for (const item of s.items) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.subtotal;
      } else {
        map.set(item.productId, {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.subtotal,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
});

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

async function handleExportAndClose() {
  if (!currentShift.value) return;
  isExporting.value = true;
  try {
    const { report, filename } = await store.exportShiftReport(currentShift.value);

    // Trigger browser file download
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    store.closeShift();
    emit('shift-closed');
  } catch (e: any) {
    store.showToast(`Ошибка экспорта отчёта: ${e.message}`, 'error');
  } finally {
    isExporting.value = false;
  }
}

function handleCloseOnly() {
  store.closeShift();
  emit('shift-closed');
}

function copyReportJson() {
  if (!currentShift.value) return;
  const lines = [
    `📊 Отчёт смены: ${currentShift.value.employeeName}`,
    `Кафе: ${store.settings.cafeName}`,
    `Дата: ${new Date().toLocaleDateString()}`,
    `Время: ${formatTime(currentShift.value.startTime)} - ${formatTime(new Date().toISOString())}`,
    `Продаж: ${currentShift.value.salesCount}`,
    `Выручка: ${currentShift.value.totalRevenue} ${store.settings.currency}`,
    '-----------------------',
    ...itemsSummary.value.map((i) => `${i.name}: ${i.quantity} × ${i.price} = ${i.total} ${store.settings.currency}`),
    '-----------------------',
    `Shift ID: ${currentShift.value.id}`,
  ].join('\n');

  navigator.clipboard.writeText(lines);
  store.showToast('Текст отчёта скопирован для отправки в Telegram/WhatsApp', 'success');
}
</script>
