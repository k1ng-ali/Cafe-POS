<template>
  <div class="app-shell">
    <AdminSetupModal
      v-if="!store.isConfigured && !store.isCatalogImported && !allowCashierImport"
      @cashier-import="allowCashierImport = true"
    />

    <template v-else-if="store.currentMode === 'admin'">
      <AdminDashboard @switch-to-cashier="store.currentMode = 'cashier'" />
    </template>

    <template v-else>
      <PosRegister @switch-to-admin="handlePromptAdminPin" />

      <EmployeeLoginModal
        v-if="store.isCatalogImported && !store.currentEmployee"
        @switch-to-admin="handlePromptAdminPin"
      />
    </template>

    <div v-if="showAdminPinPrompt" class="admin-pin-modal">
      <div id="admin-pin-prompt-modal" class="admin-pin-modal__card">
        <div class="admin-pin-modal__header">
          <div class="admin-pin-modal__icon">
            <ShieldAlert class="w-6 h-6" />
          </div>
          <h3>Вход администратора</h3>
          <p>Введите PIN администратора (по умолчанию: 1234)</p>
        </div>

        <div class="admin-pin-modal__body">
          <input
            id="admin-pin-input"
            v-model="adminPinInput"
            type="password"
            maxlength="8"
            placeholder="PIN..."
            @keyup.enter="confirmAdminPin"
          />
          <p v-if="adminPinError" class="admin-pin-modal__error">
            {{ adminPinError }}
          </p>
        </div>

        <div class="admin-pin-modal__actions">
          <button type="button" class="btn btn--ghost" @click="showAdminPinPrompt = false">
            Отмена
          </button>
          <button id="btn-confirm-admin-pin" type="button" class="btn btn--primary" @click="confirmAdminPin">
            Войти
          </button>
        </div>
      </div>
    </div>

    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePosStore } from './stores/posStore';
import PosRegister from './components/pos/PosRegister.vue';
import AdminDashboard from './components/admin/AdminDashboard.vue';
import EmployeeLoginModal from './components/pos/EmployeeLoginModal.vue';
import ToastNotification from './components/common/ToastNotification.vue';
import AdminSetupModal from './components/setup/AdminSetupModal.vue';
import { ShieldAlert } from 'lucide-vue-next';

const store = usePosStore();
const showAdminPinPrompt = ref(false);
const adminPinInput = ref('');
const adminPinError = ref('');
const allowCashierImport = ref(false);

onMounted(() => {
  store.loadFromStorage();
});

function handlePromptAdminPin() {
  adminPinInput.value = '';
  adminPinError.value = '';
  showAdminPinPrompt.value = true;
}

function confirmAdminPin() {
  if (adminPinInput.value === store.settings.adminPin) {
    store.currentMode = 'admin';
    showAdminPinPrompt.value = false;
    store.showToast('Вход в панель администратора выполнен', 'success');
  } else {
    adminPinError.value = 'Неверный PIN администратора';
  }
}
</script>
