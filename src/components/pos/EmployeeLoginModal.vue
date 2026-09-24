<template>
  <div class="login-modal-backdrop">
    <div id="employee-login-modal" class="login-modal">
      <div class="login-modal__header">
        <div class="login-modal__icon">
          <Coffee class="icon icon--lg" />
        </div>
        <h2>{{ store.settings.cafeName }}</h2>
        <p>Выберите сотрудника и введите 4-значный PIN</p>
      </div>

      <div class="login-modal__employees">
        <label>Выберите сотрудника:</label>
        <div class="employee-grid">
          <button
            v-for="emp in activeEmployees"
            :key="emp.id"
            :id="`select-emp-${emp.id}`"
            type="button"
            @click="selectEmployee(emp)"
            class="employee-card"
            :class="selectedEmp?.id === emp.id ? 'employee-card--selected' : ''"
          >
            <div class="employee-card__avatar">{{ emp.name.charAt(0) }}</div>
            <span class="employee-card__name">{{ emp.name }}</span>
            <span class="employee-card__role">{{ emp.role === 'barista' ? 'Бариста' : 'Кассир' }}</span>
          </button>
        </div>
      </div>

      <div v-if="selectedEmp" class="login-modal__pin-panel">
        <div class="pin-panel__header">
          <span>PIN для {{ selectedEmp.name }}:</span>
          <div class="pin-indicator">
            <div v-for="i in 4" :key="i" class="pin-dot" :class="pin.length >= i ? 'pin-dot--filled' : ''"></div>
          </div>
          <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
          <p v-else class="pin-hint">Введите PIN, который выдал администратор</p>
        </div>

        <div class="keypad">
          <button v-for="digit in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="digit" :id="`pin-btn-${digit}`" type="button" class="keypad__button" @click="appendDigit(digit)">{{ digit }}</button>
          <button id="pin-btn-clear" type="button" class="keypad__button keypad__button--meta" @click="clearPin">Сброс</button>
          <button id="pin-btn-0" type="button" class="keypad__button" @click="appendDigit(0)">0</button>
          <button id="pin-btn-backspace" type="button" class="keypad__button keypad__button--meta" @click="backspace"><Delete class="icon icon--sm" /></button>
        </div>
      </div>

      <div class="login-modal__footer">
        <button id="btn-switch-to-admin" type="button" class="switch-admin" @click="$emit('switch-to-admin')">
          <ShieldAlert class="icon icon--xs" />
          <span>Войти как Администратор</span>
        </button>
        <span class="version">v{{ store.catalogVersion }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
}

.login-modal {
  width: min(100%, 30rem);
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.36);
  padding: 1.5rem;
  color: #edf2ff;
  display: flex;
  flex-direction: column;
  gap: 1.3rem;
}

.login-modal__header {
  text-align: center;

  h2 {
    margin: 0.5rem 0 0.15rem;
    font-size: 1.8rem;
    color: #fff;
  }

  p {
    margin: 0;
    color: #a7b4c8;
    font-size: 0.72rem;
  }
}

.login-modal__icon {
  width: 3.5rem;
  height: 3.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: rgba(244, 201, 109, 0.1);
  border: 1px solid rgba(244, 201, 109, 0.2);
  color: #f4c96d;
}

.login-modal__employees label {
  display: block;
  color: #a9b5c6;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 0.6rem;
}

.employee-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

.employee-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  min-height: 5.3rem;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #1e2430;
  color: #dfeafc;
  padding: 0.75rem 0.5rem;
  transition: 0.2s ease;

  &--selected {
    background: rgba(244, 201, 109, 0.12);
    border-color: rgba(244, 201, 109, 0.6);
    color: #f7d37a;
    box-shadow: 0 0 0 2px rgba(244, 201, 109, 0.12);
  }
}

.employee-card__avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(148, 163, 184, 0.14);
  color: #edf2ff;
  font-size: 0.72rem;
  font-weight: 900;
}

.employee-card__name {
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.7rem;
  font-weight: 700;
}

.employee-card__role {
  font-size: 0.56rem;
  color: #99a7ba;
  text-transform: capitalize;
}

.pin-panel__header {
  text-align: center;

  > span {
    color: #aab4c5;
    font-size: 0.68rem;
    font-weight: 700;
  }
}

.pin-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.7rem;
  margin-top: 0.7rem;
}

.pin-dot {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  border: 2px solid #6b7280;
  background: #1e2430;
  transition: 0.15s ease;

  &--filled {
    background: #f4c96d;
    border-color: #f4c96d;
    transform: scale(1.15);
    box-shadow: 0 0 0 6px rgba(244, 201, 109, 0.15);
  }
}

.error-message,
.pin-hint {
  margin: 0.55rem 0 0;
  font-size: 0.62rem;
}

.error-message { color: #ffb7c2; }
.pin-hint { color: #7f8ca1; }

.keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  max-width: 17.5rem;
  margin: 0 auto;
}

.keypad__button {
  height: 3.2rem;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: #1e2430;
  color: #edf2ff;
  font-size: 1.15rem;
  font-weight: 800;

  &--meta {
    font-size: 0.68rem;
    color: #b5bfd2;
  }
}

.login-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  color: #9aa7ba;
  font-size: 0.68rem;
}

.switch-admin {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #dfeafc;
  text-decoration: underline;
  text-underline-offset: 0.15rem;
}

.version {
  color: #75829a;
  font-size: 0.62rem;
}

.icon { display: inline-block; }
.icon--xs { width: 0.8rem; height: 0.8rem; }
.icon--sm { width: 1rem; height: 1rem; }
.icon--lg { width: 1.8rem; height: 1.8rem; }
</style>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { Employee } from '../../types';
import { Coffee, Delete, ShieldAlert } from 'lucide-vue-next';

defineEmits<{
  (e: 'switch-to-admin'): void;
}>();

const store = usePosStore();
const activeEmployees = computed(() => store.employees.filter((e) => e.active));

const selectedEmp = ref<Employee | null>(activeEmployees.value[0] || null);
const pin = ref<string>('');
const errorMessage = ref<string>('');

function selectEmployee(emp: Employee) {
  selectedEmp.value = emp;
  pin.value = '';
  errorMessage.value = '';
}

function appendDigit(digit: number) {
  if (pin.value.length < 4) {
    pin.value += digit.toString();
    errorMessage.value = '';
    if (pin.value.length === 4) {
      submitPin();
    }
  }
}

function backspace() {
  pin.value = pin.value.slice(0, -1);
  errorMessage.value = '';
}

function clearPin() {
  pin.value = '';
  errorMessage.value = '';
}

function submitPin() {
  if (!selectedEmp.value) return;
  const success = store.loginEmployee(selectedEmp.value, pin.value);
  if (!success) {
    errorMessage.value = 'Неверный PIN-код. Попробуйте еще раз.';
    pin.value = '';
  }
}
</script>
