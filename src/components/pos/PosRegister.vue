<template>
  <div class="pos-register">
    <header class="pos-header">
      <div class="pos-header__brand">
        <div class="pos-header__icon">
          <Coffee class="icon icon--sm" />
        </div>
        <div class="pos-header__meta">
          <div class="pos-header__title-row">
            <h1>{{ store.settings.cafeName }}</h1>
            <span class="catalog-version">v{{ store.catalogVersion }}</span>
          </div>
          <div class="pos-header__status-row">
            <span class="pos-header__employee">
              <User class="icon icon--xs" />
              {{ store.currentEmployee?.name || 'Кассир' }}
            </span>
            <span class="divider">•</span>
            <span v-if="store.activeShift" class="pos-header__shift pos-header__shift--live">
              <span class="live-dot"></span>
              Смена с {{ formatShiftTime(store.activeShift.startTime) }}
            </span>
            <span v-else class="pos-header__shift pos-header__shift--idle">Смена не начата</span>
          </div>
        </div>
      </div>

      <div v-if="store.activeShift" class="pos-summary hidden-md">
        <div>
          <span>Продаж за смену</span>
          <strong>{{ store.activeShift.salesCount }}</strong>
        </div>
        <div class="pos-summary__divider"></div>
        <div>
          <span>Выручка</span>
          <strong>{{ store.activeShift.totalRevenue }} {{ store.settings.currency }}</strong>
        </div>
      </div>

      <div class="pos-header__actions">
        <button id="btn-open-catalog-import" type="button" class="action-button action-button--dark" @click="showCatalogImportModal = true" title="Импортировать обновленный каталог .catalog">
          <FolderSync class="icon icon--xs" />
          <span>Каталог</span>
        </button>

        <button id="btn-open-sales-history" type="button" class="action-button action-button--dark" @click="showSalesHistoryModal = true" title="История смен и продаж">
          <History class="icon icon--xs" />
          <span>История</span>
        </button>

        <button v-if="store.activeShift" id="btn-open-shift-close" type="button" class="action-button action-button--warning" @click="showShiftClosingModal = true">
          <LogOut class="icon icon--xs" />
          <span>Закрыть смену</span>
        </button>

        <button v-else id="btn-start-shift-header" type="button" class="action-button action-button--success" @click="store.startShift">
          <Play class="icon icon--xs" />
          <span>Начать смену</span>
        </button>

        <button id="btn-switch-employee" type="button" class="icon-button" @click="store.logoutEmployee" title="Сменить сотрудника / PIN">
          <Users class="icon icon--sm" />
        </button>

        <button id="btn-enter-admin-mode" type="button" class="action-button action-button--admin" @click="$emit('switch-to-admin')" title="Панель администратора">
          <ShieldAlert class="icon icon--xs" />
          <span>Админ</span>
        </button>
      </div>
    </header>

    <div class="pos-workspace">
      <section class="catalog-panel">
        <div class="catalog-panel__controls">
          <div class="search-field">
            <Search class="icon icon--xs" />
            <input id="pos-search-input" v-model="searchQuery" type="text" placeholder="Поиск по меню (название, категория)..." />
            <button v-if="searchQuery" type="button" class="clear-search" @click="searchQuery = ''">
              <X class="icon icon--xs" />
            </button>
          </div>

          <div class="category-strip">
            <button id="category-tab-all" type="button" class="category-card" :class="selectedCategoryId === null ? 'category-card--selected' : ''" @click="selectedCategoryId = null">
              <div class="category-card__title"><span>✨</span><span>Все меню</span></div>
              <span class="category-card__meta">{{ activeProducts.length }} позиций</span>
            </button>

            <button v-for="cat in store.categories" :key="cat.id" :id="`category-tab-${cat.id}`" type="button" class="category-card category-card--color" :class="selectedCategoryId === cat.id ? 'category-card--active' : ''" :style="{ background: cat.accentBg }" @click="selectedCategoryId = cat.id">
              <div class="category-card__title"><span>{{ cat.icon }}</span><span>{{ cat.name }}</span></div>
              <span class="category-card__meta">{{ getCategoryProductCount(cat.id) }} позиций</span>
            </button>
          </div>
        </div>

        <div class="product-grid-wrap">
          <div v-if="filteredProducts.length > 0" class="product-grid">
            <div v-for="product in filteredProducts" :key="product.id" :id="`product-card-${product.id}`" class="product-card" :class="getProductQuantityInCart(product.id) > 0 ? 'product-card--selected' : ''" @click="handleProductCardClick(product)">
              <div class="product-card__header">
                <span class="product-card__icon">{{ product.icon || '☕' }}</span>
                <span class="product-card__price">{{ product.price }} {{ store.settings.currency }}</span>
              </div>

              <div class="product-card__body">
                <h3>{{ product.name }}</h3>
                <p v-if="product.description">{{ product.description }}</p>
                <span>{{ getCategoryName(product.categoryId) }}</span>
              </div>

              <div class="product-card__footer">
                <template v-if="getProductQuantityInCart(product.id) > 0">
                  <div class="product-stepper" @click.stop>
                    <button :id="`btn-decrease-${product.id}`" type="button" class="stepper-button stepper-button--dark" @click="store.decreaseQuantity(product.id)"><Minus class="icon icon--xs" /></button>
                    <span>{{ getProductQuantityInCart(product.id) }}</span>
                    <button :id="`btn-increase-${product.id}`" type="button" class="stepper-button stepper-button--primary" @click="store.addToCart(product)"><Plus class="icon icon--xs" /></button>
                  </div>
                </template>
                <template v-else>
                  <button type="button" class="product-add-button">
                    <Plus class="icon icon--xs" />
                    <span>Добавить</span>
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <UtensilsCrossed class="icon icon--lg" />
            <h4>Товары не найдены</h4>
            <p>По запросу ничего не найдено или в выбранной категории нет активных позиций.</p>
          </div>
        </div>
      </section>

      <aside class="cart-panel hidden-lg">
        <div class="cart-panel__header">
          <div>
            <h2><ShoppingBag class="icon icon--xs" /> Текущий заказ</h2>
            <p>Позиций: {{ store.cartTotalItemsCount }}</p>
          </div>
          <button v-if="store.cart.length > 0" id="btn-clear-cart" type="button" class="text-link" @click="store.clearCart">Очистить</button>
        </div>

        <div class="cart-list">
          <div v-for="item in store.cart" :key="item.productId" :id="`cart-item-${item.productId}`" class="cart-item">
            <div class="cart-item__info">
              <h4>{{ item.product.name }}</h4>
              <span>{{ item.product.price }} {{ store.settings.currency }}</span>
            </div>

            <div class="cart-item__controls">
              <button type="button" class="tiny-button" @click="store.decreaseQuantity(item.productId)"><Minus class="icon icon--xs" /></button>
              <span>{{ item.quantity }}</span>
              <button type="button" class="tiny-button tiny-button--primary" @click="store.addToCart(item.product)"><Plus class="icon icon--xs" /></button>
            </div>

            <div class="cart-item__total">{{ item.product.price * item.quantity }} {{ store.settings.currency }}</div>
          </div>

          <div v-if="store.cart.length === 0" class="cart-empty">
            <ShoppingBag class="icon icon--md" />
            <span>Корзина пуста</span>
            <p>Нажмите на блюдо или напиток из каталога слева</p>
          </div>
        </div>

        <div class="cart-panel__footer">
          <div class="payment-selector">
            <span>Способ оплаты:</span>
            <div class="payment-options">
              <button id="pay-cash-btn" type="button" class="payment-option" :class="store.selectedPaymentMethod === 'cash' ? 'payment-option--selected' : ''" @click="store.selectedPaymentMethod = 'cash'">
                <Banknote class="icon icon--xs" />
                <span>Наличные</span>
              </button>
              <button id="pay-card-btn" type="button" class="payment-option" :class="store.selectedPaymentMethod === 'card' ? 'payment-option--selected' : ''" @click="store.selectedPaymentMethod = 'card'">
                <CreditCard class="icon icon--xs" />
                <span>Карта</span>
              </button>
              <button id="pay-qr-btn" type="button" class="payment-option" :class="store.selectedPaymentMethod === 'qr' ? 'payment-option--selected' : ''" @click="store.selectedPaymentMethod = 'qr'">
                <QrCode class="icon icon--xs" />
                <span>QR / Кошелек</span>
              </button>
            </div>
          </div>

          <div class="total-row">
            <span>Итого:</span>
            <strong>{{ store.cartTotalAmount }} <em>{{ store.settings.currency }}</em></strong>
          </div>

          <button id="btn-checkout-sale" type="button" class="checkout-button" @click="handleCheckout" :disabled="store.cart.length === 0">
            <CheckCircle2 class="icon icon--sm" />
            <span>ЗАКРЫТЬ ПРОДАЖУ</span>
          </button>
        </div>
      </aside>

      <div v-if="store.cart.length > 0" class="mobile-cart-bar">
        <button type="button" class="mobile-cart-bar__button" @click="showMobileCartDrawer = true">
          <div class="mobile-cart-bar__count">{{ store.cartTotalItemsCount }}</div>
          <div>
            <div class="mobile-cart-bar__label">Корзина (нажмите для деталей)</div>
            <div class="mobile-cart-bar__sum">{{ store.cartTotalAmount }} {{ store.settings.currency }}</div>
          </div>
        </button>

        <button type="button" class="mobile-cart-bar__checkout" @click="handleCheckout">Оплатить</button>
      </div>

      <div v-if="showMobileCartDrawer" class="mobile-cart-drawer">
        <div class="mobile-cart-drawer__sheet">
          <div class="mobile-cart-drawer__header">
            <h3>Корзина заказа</h3>
            <button type="button" class="close-button" @click="showMobileCartDrawer = false"><X class="icon icon--sm" /></button>
          </div>

          <div class="mobile-cart-drawer__items">
            <div v-for="item in store.cart" :key="item.productId" class="mobile-cart-item">
              <div>
                <span class="mobile-cart-item__name">{{ item.product.name }}</span>
                <span class="mobile-cart-item__price">{{ item.product.price }} {{ store.settings.currency }}</span>
              </div>
              <div class="mobile-cart-item__controls">
                <button type="button" @click="store.decreaseQuantity(item.productId)">-</button>
                <span>{{ item.quantity }}</span>
                <button type="button" class="mobile-cart-item__plus" @click="store.addToCart(item.product)">+</button>
              </div>
            </div>
          </div>

          <div class="mobile-cart-drawer__footer">
            <div class="mobile-cart-drawer__total">
              <span>Сумма:</span>
              <strong>{{ store.cartTotalAmount }} {{ store.settings.currency }}</strong>
            </div>
            <button type="button" class="mobile-cart-drawer__checkout" @click="handleCheckoutMobile">ЗАКРЫТЬ ПРОДАЖУ</button>
          </div>
        </div>
      </div>
    </div>

    <ShiftClosingModal v-if="showShiftClosingModal" @cancel="showShiftClosingModal = false" @shift-closed="handleShiftClosed" />
    <CatalogImportModal v-if="showCatalogImportModal" @close="showCatalogImportModal = false" />
    <SalesHistoryModal v-if="showSalesHistoryModal" @close="showSalesHistoryModal = false" />
    <ReceiptModal v-if="showReceiptModal" :sale="currentReceiptSale" @close="showReceiptModal = false" />
  </div>
</template>

<style scoped lang="scss">
.pos-register {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  background: #0e1117;
  color: #edf2ff;
  overflow: hidden;
}

.pos-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 4rem;
  padding: 0.55rem 0.7rem;
  background: #141822;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  flex-shrink: 0;
}

.pos-header__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.pos-header__icon {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(244, 201, 109, 0.12);
  border: 1px solid rgba(244, 201, 109, 0.25);
  color: #f4c96d;
  flex-shrink: 0;
}

.pos-header__meta { min-width: 0; }

.pos-header__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;

  h1 {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.catalog-version {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  background: #1d2430;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #dfeafc;
  font-size: 0.58rem;
  font-family: 'JetBrains Mono', monospace;
}

.pos-header__status-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #a7b4c8;
  font-size: 0.66rem;
  margin-top: 0.15rem;
}

.pos-header__employee,
.pos-header__shift {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.pos-header__employee { color: #dfeafc; }

.divider { color: rgba(148, 163, 184, 0.7); }

.pos-header__shift--live { color: #7fe7bc; }
.pos-header__shift--idle { color: #f4c96d; }

.live-dot {
  width: 0.45rem;
  height: 0.45rem;
  display: inline-block;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.18);
}

.pos-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.4rem 0.75rem;
  border-radius: 14px;
  background: #1c222e;
  border: 1px solid rgba(148, 163, 184, 0.12);
  font-size: 0.68rem;
  color: #a6b2c3;

  div {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  strong {
    color: #fff;
    font-size: 0.74rem;
  }
}

.pos-summary__divider {
  width: 1px;
  height: 1.5rem;
  background: rgba(148, 163, 184, 0.2);
}

.pos-header__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  > * { flex: 0 0 auto; }
}

.action-button,
.icon-button,
.text-link,
.checkout-button,
.mobile-cart-bar__checkout,
.mobile-cart-drawer__checkout,
.product-add-button,
.stepper-button,
.payment-option,
.tiny-button,
.close-button {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  font-weight: 700;
  transition: 0.2s ease;
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.2rem;
  padding: 0.5rem 0.7rem;
  font-size: 0.68rem;
}

.action-button--dark { background: #1d2430; color: #ebf0f9; }
.action-button--warning { background: rgba(244, 201, 109, 0.12); border-color: rgba(244, 201, 109, 0.25); color: #f2d98b; }
.action-button--success { background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.25); color: #8fe7c2; }
.action-button--admin { background: #222836; color: #dfeafc; }

.icon-button {
  width: 2.2rem;
  height: 2.2rem;
  display: grid;
  place-items: center;
  background: #1d2430;
  color: #dfeafc;
}

.pos-workspace {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

.catalog-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #0e1117;
  overflow: hidden;
}

.catalog-panel__controls {
  background: #121620;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  padding: 0.75rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.search-field {
  position: relative;

  svg {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    color: #a7b4c8;
  }

  input {
    width: 100%;
    min-height: 2.5rem;
    background: #1a202c;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 12px;
    color: #edf2ff;
    padding: 0.65rem 2.4rem 0.65rem 2.4rem;
    font-size: 0.75rem;
    outline: none;
  }
}

.clear-search {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: #b5bfd2;
}

.category-strip {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
}

.category-card {
  flex-shrink: 0;
  min-width: 6.2rem;
  height: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  background: #181d28;
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #dfeafc;
  text-align: left;

  &--selected {
    background: rgba(244, 201, 109, 0.18);
    border-color: rgba(244, 201, 109, 0.35);
    color: #f9db8b;
    box-shadow: 0 0 0 2px rgba(244, 201, 109, 0.12);
  }

  &--active {
    box-shadow: 0 0 0 2px rgba(255,255,255,0.18);
    transform: scale(1.01);
  }
}

.category-card__title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.7rem;
  font-weight: 900;
}

.category-card__meta {
  font-size: 0.56rem;
  opacity: 0.8;
}

.product-grid-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 0.75rem 6rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;

  @media (min-width: 640px) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  @media (min-width: 1024px) { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.product-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 9.7rem;
  border-radius: 18px;
  padding: 0.8rem;
  background: #161a23;
  border: 1px solid rgba(148, 163, 184, 0.18);
  cursor: pointer;
  user-select: none;
  transition: 0.15s ease;

  &:hover { background: #1c222e; }

  &--selected {
    background: #1c222e;
    box-shadow: 0 0 0 2px rgba(244, 201, 109, 0.2);
  }
}

.product-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.3rem;
  margin-bottom: 0.55rem;
}

.product-card__icon {
  font-size: 1.7rem;
  line-height: 1;
}

.product-card__price {
  padding: 0.25rem 0.45rem;
  border-radius: 8px;
  background: #242b3a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #f4c96d;
  font-size: 0.62rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
}

.product-card__body {
  margin-bottom: 0.65rem;

  h3 {
    margin: 0;
    color: #edf2ff;
    font-size: 0.8rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: #93a0b6;
    font-size: 0.6rem;
    line-height: 1.4;
  }

  span {
    display: block;
    margin-top: 0.3rem;
    color: #7f8ca1;
    font-size: 0.56rem;
  }
}

.product-card__footer {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.product-stepper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #242b3a;
  border: 1px solid rgba(244, 201, 109, 0.25);
  border-radius: 12px;
  padding: 0.2rem;

  span {
    font-size: 0.7rem;
    font-family: 'JetBrains Mono', monospace;
    color: #f4c96d;
    padding: 0 0.3rem;
  }
}

.stepper-button {
  width: 1.8rem;
  height: 1.8rem;
  display: grid;
  place-items: center;
  border-radius: 10px;

  &--dark { background: #1d2430; color: #dfeafc; }
  &--primary { background: #f4c96d; color: #111827; }
}

.product-add-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  background: #202634;
  border-color: rgba(148, 163, 184, 0.18);
  color: #b4c0d0;
  min-height: 2.1rem;
  font-size: 0.68rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 16rem;
  gap: 0.5rem;
  color: #6f7d91;

  h4 {
    margin: 0;
    color: #dfeafc;
  }

  p {
    margin: 0;
    max-width: 18rem;
    font-size: 0.68rem;
  }
}

.cart-panel {
  width: 20rem;
  display: flex;
  flex-direction: column;
  background: #13161f;
  border-left: 1px solid rgba(148, 163, 184, 0.18);
  flex-shrink: 0;
  height: 100%;
}

.cart-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  h2 {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0;
    color: #fff;
    font-size: 0.95rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: #9aa7ba;
    font-size: 0.64rem;
    font-family: 'JetBrains Mono', monospace;
  }
}

.text-link {
  background: transparent;
  border: none;
  color: #a7b4c8;
  font-size: 0.68rem;
}

.cart-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  background: #1a202c;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  padding: 0.7rem;
}

.cart-item__info {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0;
    color: #edf2ff;
    font-size: 0.72rem;
    max-width: 7rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span {
    color: #a7b4c8;
    font-size: 0.6rem;
    font-family: 'JetBrains Mono', monospace;
  }
}

.cart-item__controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: #232b3b;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  padding: 0.2rem;

  span {
    min-width: 1rem;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    color: #f4c96d;
    font-size: 0.68rem;
  }
}

.tiny-button {
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  background: #1d2430;
  color: #e6edf8;

  &--primary {
    background: #f4c96d;
    color: #111827;
  }
}

.cart-item__total {
  width: 4.4rem;
  text-align: right;
  color: #edf2ff;
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
}

.cart-empty {
  min-height: 11rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  text-align: center;
  color: #7887a0;
  background: rgba(255,255,255,0.01);

  span {
    font-size: 0.72rem;
    font-weight: 700;
    color: #dfeafc;
  }

  p {
    margin: 0;
    max-width: 11rem;
    font-size: 0.58rem;
  }
}

.cart-panel__footer {
  background: #161a24;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.payment-selector {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  > span {
    color: #9aa7ba;
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 800;
  }
}

.payment-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.payment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-height: 3.1rem;
  background: #1e2432;
  color: #b7c3d5;
  border-color: rgba(148, 163, 184, 0.12);
  padding: 0.5rem 0.35rem;
  font-size: 0.7rem;

  &--selected {
    background: rgba(244, 201, 109, 0.12);
    border-color: rgba(244, 201, 109, 0.42);
    color: #f1d88b;
  }
}

.total-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  color: #9aa7ba;

  strong {
    color: #fff;
    font-size: 1.7rem;
    font-family: 'JetBrains Mono', monospace;
  }

  em {
    color: #f4c96d;
    font-size: 0.8rem;
    font-style: normal;
    margin-left: 0.2rem;
  }
}

.checkout-button {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 3rem;
  background: #f4c96d;
  border-color: rgba(244, 201, 109, 0.35);
  color: #111827;
  font-size: 0.78rem;
  font-weight: 900;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.mobile-cart-bar {
  position: fixed;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: rgba(24, 29, 40, 0.95);
  border: 1px solid rgba(244, 201, 109, 0.4);
  border-radius: 16px;
  padding: 0.7rem;
  box-shadow: 0 24px 38px rgba(0, 0, 0, 0.28);
}

.mobile-cart-bar__button {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-align: left;
  flex: 1;
}

.mobile-cart-bar__count {
  width: 2.3rem;
  height: 2.3rem;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(244, 201, 109, 0.16);
  border: 1px solid rgba(244, 201, 109, 0.25);
  color: #f4c96d;
  font-weight: 900;
}

.mobile-cart-bar__label {
  color: #a7b4c8;
  font-size: 0.55rem;
}

.mobile-cart-bar__sum {
  color: #fff;
  font-size: 0.8rem;
  font-weight: 900;
  font-family: 'JetBrains Mono', monospace;
}

.mobile-cart-bar__checkout,
.mobile-cart-drawer__checkout {
  background: #f4c96d;
  color: #111827;
  min-height: 2.5rem;
  padding: 0.7rem 1rem;
  font-size: 0.68rem;
}

.mobile-cart-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
}

.mobile-cart-drawer__sheet {
  width: 100%;
  max-height: 85vh;
  background: #161a23;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px 24px 0 0;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.mobile-cart-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);

  h3 {
    margin: 0;
    color: #fff;
    font-size: 1rem;
  }
}

.mobile-cart-drawer__items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  max-height: 15rem;
}

.mobile-cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  background: #1e2533;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 14px;
  padding: 0.7rem;
}

.mobile-cart-item__name {
  display: block;
  color: #edf2ff;
  font-weight: 800;
  font-size: 0.72rem;
}

.mobile-cart-item__price {
  display: block;
  margin-top: 0.15rem;
  color: #a7b4c8;
  font-size: 0.6rem;
}

.mobile-cart-item__controls {
  display: flex;
  align-items: center;
  gap: 0.45rem;

  button {
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 8px;
    background: #1d2430;
    color: #eaf1ff;
    border: 1px solid rgba(148, 163, 184, 0.18);
  }

  span {
    min-width: 1rem;
    text-align: center;
    color: #f4c96d;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
  }
}

.mobile-cart-item__plus {
  background: #f4c96d !important;
  color: #111827 !important;
}

.mobile-cart-drawer__footer {
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  padding-top: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.mobile-cart-drawer__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: #9aa7ba;

  strong {
    color: #f4c96d;
    font-size: 1.1rem;
    font-family: 'JetBrains Mono', monospace;
  }
}

.hidden-lg { display: none; }
@media (min-width: 1024px) {
  .hidden-lg { display: flex; }
  .mobile-cart-bar { display: none; }
  .mobile-cart-drawer { display: none; }
}
@media (max-width: 1023px) {
  .hidden-md { display: none; }
}

@media (min-width: 768px) {
  .pos-header {
    flex-wrap: nowrap;
    height: 4rem;
    padding: 0 0.75rem;
  }

  .pos-header__actions {
    width: auto;
    overflow: visible;
    padding-bottom: 0;
  }
}

@media (max-width: 480px) {
  .pos-header__brand { flex: 1 1 auto; min-width: 0; }

  .pos-header__title-row h1 { font-size: 0.78rem; }
  .pos-header__status-row { font-size: 0.6rem; }

  .pos-header__actions {
    gap: 0.35rem;
    margin: 0 -0.15rem;
    padding-inline: 0.15rem;
  }

  .action-button {
    min-height: 2.05rem;
    padding: 0.42rem 0.6rem;
    font-size: 0.62rem;
  }

  .icon-button {
    width: 2.05rem;
    height: 2.05rem;
  }

  .catalog-panel__controls { padding: 0.65rem; gap: 0.6rem; }
  .product-grid-wrap { padding: 0.65rem 0.65rem 6rem; }
  .product-grid { gap: 0.55rem; }
  .product-card { min-height: 9.35rem; padding: 0.7rem; border-radius: 16px; }
  .product-card__icon { font-size: 1.5rem; }
  .product-card__body h3 { font-size: 0.74rem; }
  .product-card__price { font-size: 0.58rem; }
}

.icon { display: inline-block; }
.icon--xs { width: 0.8rem; height: 0.8rem; }
.icon--sm { width: 1rem; height: 1rem; }
.icon--md { width: 1.5rem; height: 1.5rem; }
.icon--lg { width: 2.2rem; height: 2.2rem; }
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePosStore } from '../../stores/posStore';
import type { Product, Sale } from '../../types';
import ShiftClosingModal from './ShiftClosingModal.vue';
import CatalogImportModal from './CatalogImportModal.vue';
import ReceiptModal from './ReceiptModal.vue';
import SalesHistoryModal from './SalesHistoryModal.vue';
import {
  Coffee,
  User,
  Users,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  FolderSync,
  History,
  LogOut,
  Play,
  ShieldAlert,
  X,
  UtensilsCrossed,
} from 'lucide-vue-next';

defineEmits<{
  (e: 'switch-to-admin'): void;
}>();

const store = usePosStore();
const searchQuery = ref('');
const selectedCategoryId = ref<string | null>(null);

const showShiftClosingModal = ref(false);
const showCatalogImportModal = ref(false);
const showSalesHistoryModal = ref(false);
const showReceiptModal = ref(false);
const showMobileCartDrawer = ref(false);
const currentReceiptSale = ref<Sale | null>(null);

onMounted(() => {
  if (!store.isCatalogImported) {
    showCatalogImportModal.value = true;
  }
});

const activeProducts = computed(() => {
  return store.products.filter((p) => p.active);
});

const filteredProducts = computed(() => {
  let list = activeProducts.value;

  if (selectedCategoryId.value) {
    list = list.filter((p) => p.categoryId === selectedCategoryId.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  return list;
});

function getCategoryProductCount(catId: string): number {
  return activeProducts.value.filter((p) => p.categoryId === catId).length;
}

function getCategoryName(catId: string): string {
  const cat = store.categories.find((c) => c.id === catId);
  return cat?.name || '';
}

function getProductQuantityInCart(productId: string): number {
  const item = store.cart.find((i) => i.productId === productId);
  return item ? item.quantity : 0;
}

function handleProductCardClick(product: Product) {
  store.addToCart(product);
}

function formatShiftTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function handleCheckout() {
  try {
    const sale = store.processSale();
    currentReceiptSale.value = sale;
    showReceiptModal.value = true;
    showMobileCartDrawer.value = false;
  } catch (e: any) {
    store.showToast(e.message || 'Ошибка оформления продажи', 'error');
  }
}

function handleCheckoutMobile() {
  handleCheckout();
}

function handleShiftClosed() {
  showShiftClosingModal.value = false;
}
</script>
