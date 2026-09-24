<template>
  <div class="catalog-editor">
    <div class="catalog-editor__header panel">
      <div>
        <div class="catalog-editor__title-row">
          <h2>Редактор каталога меню</h2>
          <span class="version-badge">Версия v{{ store.catalogVersion }}</span>
        </div>
        <p>Изменения цен и состава блюд происходят только здесь и экспортируются сотрудникам в защищённом файле.</p>
      </div>

      <div class="catalog-editor__actions">
        <button id="btn-add-category-modal" type="button" class="panel-button panel-button--subtle" @click="openAddCategoryModal">
          <FolderPlus class="icon icon--xs" />
          <span>Категория</span>
        </button>

        <button id="btn-add-product-modal" type="button" class="panel-button panel-button--primary" @click="openAddProductModal">
          <Plus class="icon icon--xs" />
          <span>Добавить товар</span>
        </button>
      </div>
    </div>

    <div class="catalog-controls">
      <div class="catalog-search">
        <Search class="icon icon--xs" />
        <input v-model="searchQuery" type="text" placeholder="Поиск по названию товара..." />
      </div>

      <select v-model="selectedCategoryFilter" class="catalog-select">
        <option value="all">Все категории ({{ store.products.length }})</option>
        <option v-for="c in store.categories" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select>
    </div>

    <div class="catalog-table-wrap panel">
      <div class="catalog-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Категория</th>
              <th>Цена продажи</th>
              <th>Себестоимость</th>
              <th>Маржа</th>
              <th class="center">Статус</th>
              <th class="right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prod in filteredProducts" :key="prod.id">
              <td data-label="Товар">
                <div class="product-name-cell">
                  <span class="product-icon">{{ prod.icon || '☕' }}</span>
                  <div>
                    <span class="product-name-text">{{ prod.name }}</span>
                    <span v-if="prod.description" class="product-description">{{ prod.description }}</span>
                  </div>
                </div>
              </td>
              <td data-label="Категория">
                <span class="category-pill">{{ getCategoryName(prod.categoryId) }}</span>
              </td>
              <td data-label="Цена продажи" class="price-cell">{{ prod.price }} {{ store.settings.currency }}</td>
              <td data-label="Себестоимость">{{ prod.costPrice ? `${prod.costPrice} ${store.settings.currency}` : '—' }}</td>
              <td data-label="Маржа" class="margin-cell">{{ prod.costPrice ? `+${(prod.price - prod.costPrice).toFixed(1)} ${store.settings.currency}` : '—' }}</td>
              <td data-label="Статус" class="center">
                <span class="status-badge" :class="prod.active ? 'status-badge--active' : 'status-badge--hidden'">{{ prod.active ? 'В меню' : 'Скрыт' }}</span>
              </td>
              <td data-label="Действия" class="right actions-cell">
                <button :id="`btn-edit-prod-${prod.id}`" type="button" class="icon-button" @click="openEditProductModal(prod)" title="Редактировать цену или название">
                  <Edit3 class="icon icon--xs" />
                </button>
                <button :id="`btn-delete-prod-${prod.id}`" type="button" class="icon-button icon-button--danger" @click="deleteProduct(prod)" title="Удалить товар">
                  <Trash2 class="icon icon--xs" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showProductModal" class="modal-overlay">
      <div class="modal-card modal-card--sm">
        <div class="modal-card__header">
          <h3>{{ isEditing ? 'Редактировать товар' : 'Новый товар' }}</h3>
          <button type="button" class="modal-close" @click="showProductModal = false">
            <X class="icon icon--xs" />
          </button>
        </div>

        <div class="field-list">
          <div class="field-group">
            <label>Название блюда / напитка:</label>
            <input v-model="productForm.name" type="text" placeholder="Например, Капучино или Бургер" />
          </div>

          <div class="field-grid">
            <div class="field-group">
              <label>Категория:</label>
              <select v-model="productForm.categoryId">
                <option v-for="c in store.categories" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
            </div>
            <div class="field-group">
              <label>Иконка / Emoji:</label>
              <input v-model="productForm.icon" type="text" placeholder="☕ 🍔 🍕 🍰 🫖" class="emoji-input" />
            </div>
          </div>

          <div class="field-grid">
            <div class="field-group">
              <label>Цена продажи ({{ store.settings.currency }}):</label>
              <input v-model.number="productForm.price" type="number" min="0" step="0.5" />
            </div>
            <div class="field-group">
              <label>Себестоимость (опц.):</label>
              <input v-model.number="productForm.costPrice" type="number" min="0" step="0.5" />
            </div>
          </div>

          <div class="field-group">
            <label>Описание (состав / объем):</label>
            <input v-model="productForm.description" type="text" placeholder="300 мл, арабика 100%..." />
          </div>

          <div class="checkbox-row">
            <input id="product-active-toggle" v-model="productForm.active" type="checkbox" />
            <label for="product-active-toggle">Товар активен и доступен кассирам для продажи</label>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="showProductModal = false">Отмена</button>
          <button id="btn-save-product-form" type="button" class="primary-button" @click="saveProduct">Сохранить</button>
        </div>
      </div>
    </div>

    <!-- Category Add Modal -->
    <div
      v-if="showCategoryModal"
      class="modal-overlay"
    >
      <div class="modal-card modal-card--sm">
        <div class="modal-card__header">
          <h3>Новая категория меню</h3>
          <button type="button" class="modal-close" @click="showCategoryModal = false">
            <X class="icon icon--xs" />
          </button>
        </div>

        <div class="field-list">
          <div>
            <label>Название категории:</label>
            <input
              v-model="categoryForm.name"
              type="text"
              placeholder="Например, Завтраки, Выпечка"
            />
          </div>
          <div>
            <label>Emoji иконка:</label>
            <input
              v-model="categoryForm.icon"
              type="text"
              placeholder="🥐"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="showCategoryModal = false">
            Отмена
          </button>
          <button id="btn-save-category-form" type="button" class="primary-button" @click="saveCategory">
            Создать
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { Product } from '../../types';
import { Plus, Edit3, Trash2, Search, X, FolderPlus } from 'lucide-vue-next';

const store = usePosStore();
const searchQuery = ref('');
const selectedCategoryFilter = ref('all');

const showProductModal = ref(false);
const isEditing = ref(false);
const editingProductId = ref('');

const productForm = ref({
  name: '',
  categoryId: store.categories[0]?.id || '',
  price: 20,
  costPrice: 5,
  icon: '☕',
  description: '',
  active: true,
});

const showCategoryModal = ref(false);
const categoryForm = ref({
  name: '',
  icon: '🍽️',
});

const filteredProducts = computed(() => {
  let list = store.products;
  if (selectedCategoryFilter.value !== 'all') {
    list = list.filter((p) => p.categoryId === selectedCategoryFilter.value);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  return list;
});

function getCategoryName(catId: string): string {
  const cat = store.categories.find((c) => c.id === catId);
  return cat?.name || '';
}

function openAddProductModal() {
  isEditing.value = false;
  editingProductId.value = '';
  productForm.value = {
    name: '',
    categoryId: store.categories[0]?.id || '',
    price: 20,
    costPrice: 6,
    icon: '☕',
    description: '',
    active: true,
  };
  showProductModal.value = true;
}

function openEditProductModal(prod: Product) {
  isEditing.value = true;
  editingProductId.value = prod.id;
  productForm.value = {
    name: prod.name,
    categoryId: prod.categoryId,
    price: prod.price,
    costPrice: prod.costPrice || 0,
    icon: prod.icon || '☕',
    description: prod.description || '',
    active: prod.active,
  };
  showProductModal.value = true;
}

function saveProduct() {
  if (!productForm.value.name.trim()) {
    store.showToast('Укажите название товара', 'error');
    return;
  }
  if (isEditing.value) {
    store.updateProduct({
      id: editingProductId.value,
      ...productForm.value,
    });
  } else {
    store.addProduct({
      ...productForm.value,
    });
  }
  showProductModal.value = false;
}

function deleteProduct(prod: Product) {
  if (confirm(`Удалить товар "${prod.name}" из каталога?`)) {
    store.deleteProduct(prod.id);
  }
}

function openAddCategoryModal() {
  categoryForm.value = { name: '', icon: '🥐' };
  showCategoryModal.value = true;
}

function saveCategory() {
  if (!categoryForm.value.name.trim()) return;
  store.addCategory({
    name: categoryForm.value.name,
    icon: categoryForm.value.icon || '🍽️',
    accentBg: 'bg-[#FDF3E3] dark:bg-[#2A2317] text-[#854D0E] dark:text-[#FDE68A] border-[#FDE68A]/60',
    accentColor: '#F59E0B',
  });
  showCategoryModal.value = false;
}
</script>

<style scoped lang="scss">
.catalog-editor {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.panel {
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
}

.catalog-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem;
}

.catalog-editor__title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #fff;
  }
}

.version-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 12px;
  padding: 0.28rem 0.6rem;
  background: rgba(244, 201, 109, 0.12);
  border: 1px solid rgba(244, 201, 109, 0.25);
  color: #f4c96d;
  font-size: 0.64rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
}

.catalog-editor__header p {
  margin: 0.35rem 0 0;
  color: #97a6bb;
  font-size: 0.72rem;
  line-height: 1.5;
}

.catalog-editor__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.panel-button,
.primary-button,
.secondary-button,
.icon-button {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.72rem;
  transition: 0.2s ease;
}

.panel-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0.65rem 0.85rem;
}

.panel-button--subtle {
  background: #1d2430;
  color: #e8edf5;
}

.panel-button--primary,
.primary-button {
  background: #f4c96d;
  border-color: rgba(244, 201, 109, 0.4);
  color: #111827;
}

.catalog-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem;
}
 input,
  .catalog-select,
  .field-group input,
  .field-group select {
    width: 100%;
    min-height: 2.7rem;
    background: #161a23;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 14px;
    padding: 0.7rem 0.8rem;
    color: #edf2ff;
    font-size: 0.72rem;
    outline: none;
  }

.catalog-search {
  position: relative;
  flex: 1 1 14rem;

  svg {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    color: #aab4c5;
  }

  input,
  .catalog-select,
  .field-group input,
  .field-group select {
    width: 100%;
    min-height: 2.7rem;
    background: #161a23;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 14px;
    padding: 0.7rem 0.8rem;
    color: #edf2ff;
    font-size: 0.72rem;
    outline: none;
  }

  input {
    padding-left: 2.3rem;
  }
}

.catalog-select {
  min-width: 12rem;
}

.catalog-table-wrap {
  overflow: hidden;
}

.catalog-table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
  font-size: 0.72rem;
}

thead {
  background: #12151e;
  color: #a6b1c3;
}

th,
td {
  padding: 0.8rem 0.7rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  text-align: left;
  vertical-align: middle;
}

th {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.6rem;
}

.center { text-align: center; }
.right { text-align: right; }

.product-name-cell {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.product-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.product-name-text {
  display: block;
  color: #edf2ff;
  font-weight: 800;
}

.product-description {
  display: block;
  margin-top: 0.12rem;
  color: #8e9bad;
  font-size: 0.65rem;
  max-width: 14rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 10px;
  background: #1d2430;
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #dfeafc;
  padding: 0.28rem 0.5rem;
  font-size: 0.64rem;
}

.price-cell,
.margin-cell {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
}

.price-cell { color: #f4c96d; }
.margin-cell { color: #6ce5a7; }

.status-badge {
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6rem;
  font-weight: 800;
  border: 1px solid transparent;
}

.status-badge--active {
  background: rgba(83, 217, 156, 0.12);
  border-color: rgba(83, 217, 156, 0.24);
  color: #6fe0ae;
}

.status-badge--hidden {
  background: rgba(251, 113, 133, 0.12);
  border-color: rgba(251, 113, 133, 0.24);
  color: #ffafbc;
}

.actions-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.icon-button {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  background: #1d2430;
  color: #dfeafc;
}

.icon-button--danger {
  color: #ffb2bf;
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
  width: min(100%, 30rem);
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 26px;
  padding: 1.2rem;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.4);
}

.modal-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  h3 {
    margin: 0;
    font-size: 1rem;
    color: #fff;
  }
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  color: #aab4c5;
  background: transparent;
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 1rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    font-size: 0.7rem;
    color: #d5dfef;
    font-weight: 700;
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

.emoji-input {
  text-align: center;
  font-size: 1.1rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: #dfeafc;
  font-size: 0.7rem;

  input {
    width: 1rem;
    height: 1rem;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.secondary-button,
.primary-button {
  min-height: 2.6rem;
  padding: 0.7rem 1rem;
}

.secondary-button {
  background: #1d2430;
  color: #eaf1ff;
  border-color: rgba(148, 163, 184, 0.2);
}

@media (max-width: 768px) {
  .catalog-editor { gap: 0.85rem; }
  .catalog-editor__header {
    align-items: stretch;
    flex-direction: column;
    padding: 0.9rem;
  }
  .catalog-editor__title-row { align-items: flex-start; flex-direction: column; gap: 0.4rem; }
  .catalog-editor__title-row h2 { font-size: 1rem; }
  .catalog-editor__header p { font-size: 0.66rem; }
  .catalog-editor__actions { width: 100%; }
  .catalog-editor__actions .panel-button { flex: 1; justify-content: center; min-width: 0; }
  .catalog-controls { align-items: stretch; flex-direction: column; }
  .catalog-search { flex-basis: auto; }
  .catalog-select { width: 100%; min-width: 0; }
  .catalog-table-wrap { 
    border-radius: 17px;
    border: none;
    background: transparent; 
  }
  .modal-card { max-height: calc(100vh - 2rem); overflow-y: auto; }
  .field-grid { grid-template-columns: 1fr; }
  .modal-actions { flex-direction: column-reverse; }
  .modal-actions button { width: 100%; }

  .catalog-table-scroll { overflow: visible; }
  .catalog-table-scroll table {
    display: block;
    min-width: 0;

  }
  .catalog-table-scroll thead { display: none; }
  .catalog-table-scroll tbody {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .catalog-table-scroll tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem 0.7rem;
    padding: 0.75rem;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 16px;
    background: #161a23;
  }
  .catalog-table-scroll td {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    padding: 0.35rem 0;
    border: 0;
    text-align: right;
    font-size: 0.66rem;
  }
  .catalog-table-scroll td::before {
    content: attr(data-label);
    color: #8996aa;
    font-size: 0.58rem;
    text-align: left;
  }
  .catalog-table-scroll td:first-child {
    grid-column: 1 / -1;
    align-items: flex-start;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  }
  .catalog-table-scroll td:first-child::before { display: none; }
  .catalog-table-scroll td:nth-child(2) { grid-column: 1 / -1; }
  .catalog-table-scroll td:nth-child(6),
  .catalog-table-scroll td:nth-child(7) { grid-column: span 1; }
  .catalog-table-scroll .product-name-cell { flex: 1; }
  .catalog-table-scroll .product-description { max-width: 12rem; }
  .catalog-table-scroll .actions-cell { justify-content: flex-end; }
  .catalog-table-scroll .actions-cell::before { margin-right: auto; }
}
</style>
