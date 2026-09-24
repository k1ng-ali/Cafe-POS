<template>
  <div class="employees-page">
    <div class="employees-header panel">
      <div>
        <h2>Управление сотрудниками</h2>
        <p>Кассиры и бариста с индивидуальными 4-значными PIN-кодами для входа в кассу</p>
      </div>

      <button id="btn-add-employee-modal" type="button" class="primary-button" @click="showAddModal = true">
        <UserPlus class="icon icon--xs" />
        <span>Новый сотрудник</span>
      </button>
    </div>

    <div class="employees-grid">
      <div v-for="emp in store.employees" :key="emp.id" class="employee-card panel">
        <div class="employee-card__top">
          <div class="employee-card__identity">
            <div class="employee-avatar">{{ emp.name.charAt(0) }}</div>
            <div>
              <h3>{{ emp.name }}</h3>
              <span>{{ emp.role === 'barista' ? 'Бариста' : 'Кассир' }}</span>
            </div>
          </div>
          <div class="employee-card__actions">
            <span class="employee-status" :class="emp.active ? 'employee-status--active' : ''">
              {{ emp.active ? 'Активен' : 'Отключен' }}
            </span>
            <button type="button" class="icon-button" title="Редактировать сотрудника" @click="openEditModal(emp)">
              <Pencil class="icon icon--xs" />
            </button>
            <button type="button" class="icon-button icon-button--danger" title="Удалить сотрудника" @click="removeEmployee(emp)">
              <Trash2 class="icon icon--xs" />
            </button>
          </div>
        </div>

        <div class="employee-card__pin">
          <span>PIN-код для входа:</span>
          <strong>{{ emp.pin }}</strong>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-card modal-card--sm">
        <div class="modal-card__header">
          <h3>{{ editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника' }}</h3>
          <button type="button" class="modal-close" @click="closeEmployeeModal">
            <X class="icon icon--xs" />
          </button>
        </div>

        <div class="field-list">
          <div class="field-group">
            <label>Имя сотрудника:</label>
            <input v-model="newEmpForm.name" type="text" placeholder="Например, Фаридун или Нигина" />
          </div>

          <div class="field-group">
            <label>Должность:</label>
            <select v-model="newEmpForm.role">
              <option value="barista">Бариста</option>
              <option value="cashier">Кассир</option>
            </select>
          </div>

          <div class="field-group">
            <label>4-значный PIN-код:</label>
            <input v-model="newEmpForm.pin" type="text" maxlength="4" placeholder="Например, 4444" class="pin-input" />
          </div>

          <label class="active-toggle">
            <input v-model="newEmpForm.active" type="checkbox" />
            <span>Сотрудник активен и может входить в кассу</span>
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="showAddModal = false">Отмена</button>
          <button id="btn-save-new-employee" type="button" class="primary-button" @click="saveEmployee">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { Employee } from '../../types';
import { Pencil, Trash2, UserPlus, X } from 'lucide-vue-next';

const store = usePosStore();
const showAddModal = ref(false);
const editingEmployee = ref<Employee | null>(null);

const newEmpForm = ref({
  name: '',
  role: 'barista' as 'barista' | 'cashier',
  pin: '1234',
  active: true,
});

function openEditModal(employee: Employee) {
  editingEmployee.value = employee;
  newEmpForm.value = {
    name: employee.name,
    role: employee.role === 'admin' ? 'cashier' : employee.role,
    pin: employee.pin,
    active: employee.active,
  };
  showAddModal.value = true;
}

function closeEmployeeModal() {
  showAddModal.value = false;
  editingEmployee.value = null;
}

function saveEmployee() {
  if (!newEmpForm.value.name.trim()) {
    store.showToast('Укажите имя сотрудника', 'error');
    return;
  }
  if (!/^\d{4}$/.test(newEmpForm.value.pin)) {
    store.showToast('PIN должен состоять ровно из 4 цифр', 'error');
    return;
  }

  const employeeData = {
    name: newEmpForm.value.name.trim(),
    role: newEmpForm.value.role,
    pin: newEmpForm.value.pin,
    active: newEmpForm.value.active,
  };

  if (editingEmployee.value) {
    store.updateEmployee({ ...editingEmployee.value, ...employeeData });
  } else {
    store.addEmployee(employeeData);
  }

  closeEmployeeModal();
  newEmpForm.value = {
    name: '',
    role: 'barista',
    pin: '1234',
    active: true,
  };
}

function removeEmployee(employee: Employee) {
  if (confirm(`Удалить сотрудника "${employee.name}"?`)) {
    store.deleteEmployee(employee.id);
  }
}
</script>

<style scoped lang="scss">
.employees-page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.panel {
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.employees-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #fff;
  }

  p {
    margin: 0.35rem 0 0;
    color: #8f9cb0;
    font-size: 0.72rem;
  }
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.8rem;
  padding: 0.7rem 1rem;
  border-radius: 14px;
  font-size: 0.72rem;
  font-weight: 800;
}

.primary-button {
  background: #f4c96d;
  color: #111827;
  border: 1px solid rgba(244, 201, 109, 0.35);
}

.secondary-button {
  background: #1d2430;
  color: #edf2ff;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.employees-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 960px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.employee-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem;
}

.employee-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.employee-card__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.employee-card__identity {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.employee-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(244, 201, 109, 0.12);
  border: 1px solid rgba(244, 201, 109, 0.2);
  color: #f4c96d;
  font-weight: 900;
}

.employee-card__identity h3 {
  margin: 0;
  color: #fff;
  font-size: 1rem;
}

.employee-card__identity span {
  color: #9aa5b5;
  font-size: 0.68rem;
}

.employee-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.26rem 0.52rem;
  font-size: 0.6rem;
  font-weight: 800;
  background: #1d2430;
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #d0d8ea;

  &--active {
    background: rgba(83, 217, 156, 0.12);
    border-color: rgba(83, 217, 156, 0.22);
    color: #7fe0b5;
  }
}

.icon-button {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: #1d2430;
  color: #dfeafc;
}

.icon-button--danger { color: #ffb2bf; }

.employee-card__pin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: #1c222e;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 0.7rem 0.8rem;
  font-size: 0.68rem;
  color: #aab4c5;

  strong {
    font-family: 'JetBrains Mono', monospace;
    color: #f4c96d;
    letter-spacing: 0.14em;
    font-size: 0.8rem;
    background: #0e141d;
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 8px;
    padding: 0.2rem 0.38rem;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  width: min(100%, 28rem);
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  padding: 1.2rem;
}

.modal-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }
}

.modal-close {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  background: transparent;
  color: #aab4c5;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    color: #dfeafc;
    font-size: 0.7rem;
    font-weight: 800;
  }

  input,
  select {
    width: 100%;
    min-height: 2.7rem;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    background: #0e141d;
    color: #edf2ff;
    padding: 0.7rem 0.8rem;
    font-size: 0.72rem;
    outline: none;
  }
}

.pin-input {
  text-align: center;
  letter-spacing: 0.25em;
  font-family: 'JetBrains Mono', monospace;
}

.active-toggle {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #dfeafc;
  font-size: 0.7rem;

  input { width: 1rem; height: 1rem; }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.7rem;
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

@media (max-width: 639px) {
  .employees-page { gap: 0.85rem; }
  .employees-header {
    align-items: stretch;
    flex-direction: column;
    padding: 0.9rem;
  }
  .employees-header h2 { font-size: 1rem; }
  .employees-header p { font-size: 0.66rem; }
  .employees-header .primary-button { width: 100%; }
  .employee-card { padding: 0.9rem; }
  .employee-card__pin { align-items: flex-start; flex-direction: column; }
  .employee-card__pin strong { align-self: stretch; text-align: center; }
  .modal-card { max-height: calc(100vh - 2rem); overflow-y: auto; }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions button { width: 100%; }
}
</style>
