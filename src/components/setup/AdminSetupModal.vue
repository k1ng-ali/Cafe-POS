<template>
  <div class="setup-screen">
    <div class="setup-card">
      <div class="setup-card__icon">
        <ShieldAlert class="icon icon--lg" />
      </div>
      <span class="setup-card__eyebrow">ПЕРВЫЙ ЗАПУСК</span>
      <h1>Настройте CoffeePOS</h1>
      <p class="setup-card__lead">Создайте доступ администратора. После этого вы сможете собрать каталог и добавить кассиров.</p>

      <form class="setup-form" @submit.prevent="submitSetup">
        <label>
          Название заведения
          <input v-model.trim="cafeName" type="text" placeholder="Например, Coffee House" autocomplete="organization" />
        </label>

        <label>
          Код администратора
          <input v-model="adminPin" type="password" inputmode="numeric" maxlength="8" placeholder="Минимум 4 цифры" autocomplete="new-password" />
        </label>

        <label>
          Повторите код
          <input v-model="adminPinConfirmation" type="password" inputmode="numeric" maxlength="8" placeholder="Повторите код" autocomplete="new-password" />
        </label>

        <p v-if="errorMessage" class="setup-form__error">{{ errorMessage }}</p>
        <button type="submit" class="setup-form__submit">
          <ArrowRight class="icon icon--sm" />
          <span>Создать и открыть админ-панель</span>
        </button>
      </form>

      <button type="button" class="setup-card__cashier-link" @click="$emit('cashier-import')">
        Я кассир, у меня есть файл каталога
      </button>

      <p class="setup-card__note">Данные хранятся только в браузере на этом устройстве. Не очищайте данные сайта после настройки.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import { ArrowRight, ShieldAlert } from 'lucide-vue-next';

defineEmits<{
  (e: 'cashier-import'): void;
}>();

const store = usePosStore();
const cafeName = ref('');
const adminPin = ref('');
const adminPinConfirmation = ref('');
const errorMessage = ref('');

function submitSetup() {
  errorMessage.value = '';

  if (cafeName.value.length < 2) {
    errorMessage.value = 'Укажите название заведения.';
    return;
  }
  if (!/^\d{4,8}$/.test(adminPin.value)) {
    errorMessage.value = 'Код должен содержать от 4 до 8 цифр.';
    return;
  }
  if (adminPin.value !== adminPinConfirmation.value) {
    errorMessage.value = 'Коды администратора не совпадают.';
    return;
  }

  store.completeInitialSetup(cafeName.value, adminPin.value);
}
</script>

<style scoped lang="scss">
.setup-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: radial-gradient(circle at top right, rgba(244, 201, 109, 0.12), transparent 35%), #0d1017;
  color: #edf2ff;
}

.setup-card {
  width: min(100%, 31rem);
  padding: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 28px;
  background: #161a23;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.32);
  text-align: center;

  h1 { margin: 0.7rem 0 0.4rem; color: #fff; font-size: 1.65rem; }
}

.setup-card__icon {
  width: 3.8rem;
  height: 3.8rem;
  display: grid;
  place-items: center;
  margin: 0 auto;
  border: 1px solid rgba(244, 201, 109, 0.24);
  border-radius: 20px;
  background: rgba(244, 201, 109, 0.1);
  color: #f4c96d;
}

.setup-card__eyebrow {
  display: block;
  margin-top: 1rem;
  color: #f4c96d;
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.setup-card__lead,
.setup-card__note {
  color: #9aa7ba;
  font-size: 0.72rem;
  line-height: 1.55;
}

.setup-card__lead { margin: 0 0 1.2rem; }
.setup-card__note { margin: 1rem 0 0; font-size: 0.62rem; }

.setup-card__cashier-link {
  margin-top: 1rem;
  border: 0;
  background: transparent;
  color: #b9c6dc;
  font-size: 0.68rem;
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  text-align: left;

  label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    color: #dfe7f5;
    font-size: 0.68rem;
    font-weight: 800;
  }

  input {
    width: 100%;
    min-height: 2.8rem;
    box-sizing: border-box;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    outline: none;
    background: #0e141d;
    color: #edf2ff;
    font-size: 0.78rem;
  }

  input:focus { border-color: #f4c96d; }
}

.setup-form__error { margin: 0; color: #ffafbc; font-size: 0.68rem; }

.setup-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.9rem;
  margin-top: 0.3rem;
  border: 0;
  border-radius: 14px;
  background: #f4c96d;
  color: #111827;
  font-size: 0.72rem;
  font-weight: 900;
}

.icon { display: inline-block; }
.icon--sm { width: 1.1rem; height: 1.1rem; }
.icon--lg { width: 1.7rem; height: 1.7rem; }
</style>
