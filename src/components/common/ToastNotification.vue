<template>
  <Transition name="toast">
    <div v-if="toast" id="toast-notification" class="toast" :class="`toast--${toast.type}`">
      <component :is="iconComponent" class="toast__icon" />
      <span class="toast__message">{{ toast.message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-vue-next';

const store = usePosStore();
const toast = computed(() => store.toast);

const iconComponent = computed(() => {
  if (!toast.value) return Info;
  switch (toast.value.type) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return XCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return Info;
  }
});
</script>

<style scoped lang="scss">
.toast {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: min(26rem, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(10px);
  font-size: 0.84rem;
  font-weight: 600;
  line-height: 1.45;

  &--success {
    background: rgba(6, 78, 59, 0.9);
    border-color: rgba(16, 185, 129, 0.4);
    color: #d8fce9;
  }

  &--error {
    background: rgba(69, 10, 10, 0.9);
    border-color: rgba(251, 113, 133, 0.4);
    color: #ffe3eb;
  }

  &--warning {
    background: rgba(120, 53, 15, 0.9);
    border-color: rgba(251, 191, 36, 0.4);
    color: #fff1c2;
  }

  &--info {
    background: rgba(15, 23, 42, 0.92);
    border-color: rgba(148, 163, 184, 0.35);
    color: #e5ecf9;
  }
}

.toast__icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.toast__message {
  white-space: pre-line;
  line-height: 1.5;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease-out;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
</style>
