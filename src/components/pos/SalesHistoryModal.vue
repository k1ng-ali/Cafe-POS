<template>
  <div class="history-backdrop" @click.self="$emit('close')">
    <section class="history-modal" aria-labelledby="sales-history-title">
      <header class="history-modal__header">
        <div>
          <span class="history-modal__eyebrow">ЛОКАЛЬНАЯ ИСТОРИЯ</span>
          <h2 id="sales-history-title">История продаж</h2>
          <p>{{ store.currentEmployee?.name }} · сохранено на этом устройстве</p>
        </div>
        <button type="button" class="close-button" aria-label="Закрыть историю" @click="$emit('close')">
          <X class="icon icon--sm" />
        </button>
      </header>

      <div class="history-summary">
        <div><span>Смен</span><strong>{{ employeeShifts.length }}</strong></div>
        <div><span>Чеков</span><strong>{{ totalSales }}</strong></div>
        <div><span>Выручка</span><strong>{{ totalRevenue }} {{ store.settings.currency }}</strong></div>
      </div>

      <div v-if="employeeShifts.length" class="history-list">
        <article v-for="shift in employeeShifts" :key="shift.id" class="shift-entry">
          <button type="button" class="shift-entry__header" @click="toggleShift(shift.id)">
            <span>
              <strong>{{ formatDate(shift.startTime) }}</strong>
              <small>{{ formatTime(shift.startTime) }}<template v-if="shift.endTime"> - {{ formatTime(shift.endTime) }}</template></small>
            </span>
            <span class="shift-entry__metrics">
              <b>{{ shift.salesCount }} чеков</b>
              <em>{{ shift.totalRevenue }} {{ store.settings.currency }}</em>
              <ChevronDown class="icon icon--xs" :class="expandedShiftId === shift.id ? 'icon--rotated' : ''" />
            </span>
          </button>
          <button
            type="button"
            class="shift-entry__export"
            :disabled="exportingShiftId === shift.id"
            title="Экспортировать отчёт смены"
            @click.stop="exportShift(shift)"
          >
            <FileDown class="icon icon--xs" />
            <span>{{ exportingShiftId === shift.id ? 'Экспорт...' : 'Экспорт' }}</span>
          </button>

          <div v-if="expandedShiftId === shift.id" class="shift-entry__sales">
            <template v-if="shift.sales.length">
              <div v-for="sale in shift.sales" :key="sale.id" class="sale-entry">
                <div>
                  <strong>Чек #{{ sale.orderNumber }}</strong>
                  <small>{{ formatTime(sale.createdAt) }} · {{ paymentLabel(sale.paymentMethod) }}</small>
                </div>
                <span>{{ sale.totalAmount }} {{ store.settings.currency }}</span>
              </div>
            </template>
            <p v-else class="empty-sales">Подробные чеки отсутствуют в этой записи смены.</p>
          </div>
        </article>
      </div>

      <div v-else class="history-empty">
        <ReceiptText class="icon icon--lg" />
        <strong>История пока пуста</strong>
        <span>Закройте первую смену, чтобы сохранить её локально.</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { PaymentMethod } from '../../types';
import { ChevronDown, FileDown, ReceiptText, X } from 'lucide-vue-next';
import type { Shift } from '../../types';

defineEmits<{ (e: 'close'): void }>();

const store = usePosStore();
const expandedShiftId = ref('');
const exportingShiftId = ref('');

const employeeShifts = computed(() => {
  const employeeId = store.currentEmployee?.id;
  if (!employeeId) return [];
  return store.historicalShifts
    .filter((shift) => shift.employeeId === employeeId)
    .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
});

const totalSales = computed(() => employeeShifts.value.reduce((total, shift) => total + shift.salesCount, 0));
const totalRevenue = computed(() => employeeShifts.value.reduce((total, shift) => total + shift.totalRevenue, 0));

function toggleShift(id: string) {
  expandedShiftId.value = expandedShiftId.value === id ? '' : id;
}

async function exportShift(shift: Shift) {
  exportingShiftId.value = shift.id;
  try {
    const { report, filename } = await store.exportShiftReport(shift);
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    store.showToast(`Отчёт ${filename} экспортирован`, 'success');
  } catch (error: any) {
    store.showToast(error.message || 'Не удалось экспортировать отчёт', 'error');
  } finally {
    exportingShiftId.value = '';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function paymentLabel(method: PaymentMethod) {
  return method === 'cash' ? 'Наличные' : method === 'card' ? 'Карта' : 'QR';
}
</script>

<style scoped lang="scss">
.history-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.82);
}

.history-modal {
  width: min(100%, 38rem);
  max-height: min(90vh, 48rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  padding: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  background: #161a23;
  color: #edf2ff;
}

.history-modal__header,
.shift-entry__header,
.history-summary,
.shift-entry__metrics,
.sale-entry {
  display: flex;
  align-items: center;
}

.history-modal__header,
.shift-entry__header {
  justify-content: space-between;
}

.history-modal__header {
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);

  h2 { margin: 0.2rem 0; color: #fff; font-size: 1.25rem; }
  p { margin: 0; color: #9aa7ba; font-size: 0.68rem; }
}

.history-modal__eyebrow { color: #f4c96d; font-size: 0.58rem; font-weight: 900; letter-spacing: 0.14em; }

.close-button {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: #232b39;
  color: #c8d2e2;
}

.history-summary {
  gap: 0.5rem;

  div {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.7rem;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 14px;
    background: #1d2430;
  }

  span { color: #9aa7ba; font-size: 0.6rem; }
  strong { color: #f4c96d; font-size: 0.8rem; }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.shift-entry {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  background: #1c222e;
  overflow: hidden;
}

.shift-entry__header {
  width: 100%;
  padding: 0.8rem;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;

  > span:first-child { display: flex; flex-direction: column; gap: 0.2rem; }
  strong { color: #fff; font-size: 0.75rem; }
  small { color: #909db1; font-size: 0.62rem; }
}

.shift-entry__export {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 1.9rem;
  margin: 0 0.7rem 0.65rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid rgba(244, 201, 109, 0.25);
  border-radius: 10px;
  background: rgba(244, 201, 109, 0.08);
  color: #f4c96d;
  font-size: 0.6rem;
  font-weight: 800;

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
}

.shift-entry__metrics {
  gap: 0.5rem;
  justify-content: flex-end;
  text-align: right;

  b { color: #c7d3e6; font-size: 0.62rem; }
  em { color: #7fe7bc; font-size: 0.68rem; font-style: normal; font-weight: 800; }
}

.icon--rotated { transform: rotate(180deg); }

.shift-entry__sales {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0 0.8rem 0.8rem;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.sale-entry {
  justify-content: space-between;
  gap: 0.7rem;
  padding-top: 0.55rem;

  div { display: flex; flex-direction: column; gap: 0.18rem; }
  strong { color: #e8eef9; font-size: 0.68rem; }
  small { color: #8795aa; font-size: 0.58rem; }
  > span { color: #f4c96d; font-size: 0.68rem; font-weight: 800; }
}

.empty-sales,
.history-empty {
  color: #8795aa;
  font-size: 0.65rem;
}

.empty-sales { margin: 0; padding-top: 0.65rem; }

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;

  strong { color: #e8eef9; }
}

.icon { display: inline-block; }
.icon--xs { width: 0.85rem; height: 0.85rem; }
.icon--sm { width: 1rem; height: 1rem; }
.icon--lg { width: 2rem; height: 2rem; color: #f4c96d; }

@media (max-width: 540px) {
  .history-summary strong { font-size: 0.68rem; }
  .shift-entry__metrics { flex-wrap: wrap; max-width: 10rem; }
}
</style>
