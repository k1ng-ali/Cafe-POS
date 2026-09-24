<template>
  <div v-if="sale" class="receipt-modal-backdrop">
    <div id="receipt-modal" class="receipt-modal">
      <div class="receipt-modal__header">
        <div class="receipt-modal__icon">
          <Check class="icon icon--md" />
        </div>
        <h3>{{ store.settings.cafeName }}</h3>
        <p>Чек #{{ sale.orderNumber }} (ID: {{ sale.id.substring(0, 8) }})</p>
      </div>

      <div class="receipt-modal__meta">
        <div><span>Сотрудник:</span> {{ sale.employeeName }}</div>
        <div class="receipt-modal__meta-right"><span>Время:</span> {{ formatTime(sale.createdAt) }}</div>
        <div>
          <span>Оплата:</span>
          <strong>{{ sale.paymentMethod === 'cash' ? 'Наличные' : sale.paymentMethod === 'card' ? 'Корти Миллӣ / Карта' : 'QR / Эл. кошелёк' }}</strong>
        </div>
        <div class="receipt-modal__meta-right"><span>Дата:</span> {{ formatDate(sale.createdAt) }}</div>
      </div>

      <div class="receipt-modal__items">
        <div v-for="(item, idx) in sale.items" :key="idx" class="receipt-item">
          <div class="receipt-item__info">
            <span>{{ item.name }}</span>
            <small>{{ item.quantity }} × {{ item.price }} {{ store.settings.currency }}</small>
          </div>
          <div class="receipt-item__total">{{ item.subtotal }} {{ store.settings.currency }}</div>
        </div>
      </div>

      <div class="receipt-modal__total">
        <span>ИТОГО К ОПЛАТЕ:</span>
        <strong>{{ sale.totalAmount }} {{ store.settings.currency }}</strong>
      </div>

      <div class="receipt-modal__actions">
        <button id="btn-copy-receipt" type="button" class="secondary-button" @click="copyReceiptText">
          <Copy class="icon icon--xs" />
          {{ copied ? 'Скопировано!' : 'Копировать чек' }}
        </button>
        <button id="btn-close-receipt" type="button" class="primary-button" @click="$emit('close')">
          <span>Следующий заказ</span>
          <ArrowRight class="icon icon--xs" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.receipt-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.85);
}

.receipt-modal {
  width: min(100%, 24rem);
  background: #161a22;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 28px;
  padding: 1.3rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  color: #edf2ff;
  position: relative;
  overflow: hidden;
}

.receipt-modal__header {
  text-align: center;
  padding-bottom: 0.7rem;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.18);

  h3 {
    margin: 0.5rem 0 0.2rem;
    color: #fff;
    font-size: 1.2rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: #a7b4c8;
    font-size: 0.68rem;
    font-family: 'JetBrains Mono', monospace;
  }
}

.receipt-modal__icon {
  width: 3rem;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #7fe7bc;
}

.receipt-modal__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 0.8rem;
  color: #dfeafc;
  font-size: 0.68rem;
  font-family: 'JetBrains Mono', monospace;

  span { color: #8b98ad; }
  strong { color: #f4c96d; }
}

.receipt-modal__meta-right { text-align: right; }

.receipt-modal__items {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  max-height: 13rem;
  overflow-y: auto;
  padding: 0.55rem 0;
  border-top: 1px dashed rgba(148, 163, 184, 0.18);
  border-bottom: 1px dashed rgba(148, 163, 184, 0.18);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
}

.receipt-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.7rem;
}

.receipt-item__info {
  flex: 1;

  span { color: #edf2ff; }
  small { display: block; margin-top: 0.18rem; color: #7f8ca1; }
}

.receipt-item__total {
  text-align: right;
  color: #edf2ff;
  font-weight: 700;
}

.receipt-modal__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  color: #edf2ff;
  font-size: 0.9rem;
  font-weight: 800;

  strong {
    color: #7fe7bc;
    font-size: 1.25rem;
    letter-spacing: -0.03em;
  }
}

.receipt-modal__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.secondary-button,
.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.9rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 700;
}

.secondary-button {
  background: #2a3241;
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #eaf1ff;
}

.primary-button {
  background: #f4c96d;
  border: 1px solid rgba(244, 201, 109, 0.25);
  color: #111827;
}

.icon { display: inline-block; }
.icon--xs { width: 0.9rem; height: 0.9rem; }
.icon--md { width: 1.4rem; height: 1.4rem; }
</style>

<script setup lang="ts">
import { ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { Sale } from '../../types';
import { Check, Copy, ArrowRight } from 'lucide-vue-next';

const props = defineProps<{
  sale: Sale | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const store = usePosStore();
const copied = ref(false);

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

function copyReceiptText() {
  if (!props.sale) return;
  const lines = [
    `☕ ${store.settings.cafeName}`,
    `Чек #${props.sale.orderNumber} (ID: ${props.sale.id.slice(0, 8)})`,
    `Сотрудник: ${props.sale.employeeName}`,
    `Время: ${formatTime(props.sale.createdAt)} ${formatDate(props.sale.createdAt)}`,
    `Способ: ${props.sale.paymentMethod}`,
    '----------------------------',
    ...props.sale.items.map((i) => `${i.name} × ${i.quantity} = ${i.subtotal} ${store.settings.currency}`),
    '----------------------------',
    `ИТОГО: ${props.sale.totalAmount} ${store.settings.currency}`,
    'Спасибо за визит!',
  ].join('\n');

  navigator.clipboard.writeText(lines);
  copied.value = true;
  store.showToast('Чек скопирован в буфер обмена', 'success');
  setTimeout(() => (copied.value = false), 2000);
}
</script>
