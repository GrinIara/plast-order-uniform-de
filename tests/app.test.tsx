import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { clearCart, resetCartCache } from '../src/lib/cart';
import { resetPendingOrderCache } from '../src/lib/pendingOrder';
import { fillContactForm, installFetchStub, posts, seedCart } from './harness';

beforeEach(() => {
  window.location.hash = '#/';
  localStorage.clear();
  resetCartCache();
  resetPendingOrderCache();
  clearCart();
  installFetchStub();
});

afterEach(() => {
  cleanup();
});

describe('повний сценарій замовлення', () => {
  it('пошук → додати → кошик → форма → відправлення → реквізити', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Каталог завантажився й згрупований за категоріями.
    expect(await screen.findByRole('heading', { name: /Сорочки/ })).toBeTruthy();

    // «одностроій» (з друкарською помилкою) знаходить товари.
    await user.type(screen.getByRole('searchbox'), 'одностроій');
    expect(await screen.findByText(/Знайдено: \d/)).toBeTruthy();

    // Додати сорочку у розмірі S.
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'сорочка');
    const shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    expect(within(shirt).getByRole('button', { name: /Оберіть розмір/ }).getAttribute('aria-disabled')).toBe('true');
    await user.click(within(shirt).getByRole('button', { name: /^S,/ }));
    await user.click(within(shirt).getByRole('button', { name: 'Додати до замовлення' }));
    expect(within(shirt).getByText(/Додано ✓ · S/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(1);

    // Кошик: позиція, оплата готівкою та порожня форма не відправляється.
    window.location.hash = '#/cart';
    expect(await screen.findByText('Позицій: 1 · штук: 1')).toBeTruthy();
    expect(screen.getByText(/Оплата готівкою/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    expect(await screen.findByText('Вкажіть ім\'я')).toBeTruthy();
    expect(posts).toHaveLength(0);

    // Заповнення та відправлення.
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].url).toBe('https://forms.example/formResponse');
    expect(posts[0].body.get('entry.1002')).toBe('UPP-SHIRT-S');
    expect(posts[0].body.has('entry.555')).toBe(false);
    expect(posts[0].body.get('entry.333')).toBe('+49 151 2345678');
    expect(posts[0].body.get('entry.777')).toBe('УСП');
    expect(posts[0].body.has('entry.888')).toBe(false);

    // «Дякуємо» з реквізитами, кошик очищено.
    expect(await screen.findByText(/Дякуємо! Замовлення відправлено/)).toBeTruthy();
    expect(screen.getByText(/Оплата готівкою/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(0);
    expect(localStorage.getItem('plast-order-v1')).toBeNull();
  });

  it('«немає» та «під замовлення» мають позначки, посилання відкривається безпечно', async () => {
    render(<App />);
    const shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    expect(within(shirt).getByText('під замовлення')).toBeTruthy();
    expect(within(shirt).getByText('немає')).toBeTruthy();
    expect(within(shirt).getByRole('button', { name: /^S, в наявності/ })).toBeTruthy();
    expect(within(shirt).getByRole('link', { name: /Переглянути на scoutstyle/ }).getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('при мережевій помилці відправлення кошик і дані зберігаються', async () => {
    const user = userEvent.setup();
    render(<App />);
    const cap = (await screen.findByRole('heading', { name: 'Пілотка' })).closest('article')!;
    await user.click(within(cap).getByRole('button', { name: 'Додати до замовлення' }));
    window.location.hash = '#/cart';
    await screen.findByText('Позицій: 1 · штук: 1');
    installFetchStub(() => {
      throw new TypeError('network');
    });

        await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));

    expect(await screen.findByText(/Не вдалося відправити\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Скопіювати текст замовлення' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(1);
  });
});

const failAt = (n: number) => (index: number) => {
  if (index === n) throw new TypeError('network');
  return new Response('');
};

async function openCartWithThreeLines() {
  seedCart(['UPP-SHIRT-S', 'UPP-SHIRT-M', 'UPP-CAP-ONE']);
  window.location.hash = '#/cart';
  render(<App />);
  await screen.findByText(/^Позицій: 3/);
}

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-57: поля імені та прізвища дитини видимі й порожні; AC-58: не копіюються з контакту', async () => {
    const user = userEvent.setup();
    await openCartWithThreeLines();
    expect(screen.getByLabelText("Ім'я дитини")).toHaveProperty('value', '');
    expect(screen.getByLabelText('Прізвище дитини')).toHaveProperty('value', '');
    await user.type(screen.getByLabelText("Ім'я"), 'Олена');
    expect(screen.getByLabelText("Ім'я дитини")).toHaveProperty('value', '');
  });

  it('AC-61: порожні поля дитини блокують відправлення й оголошують «Перевірте поля форми»', async () => {
    const user = userEvent.setup();
    await openCartWithThreeLines();
    await user.type(screen.getByLabelText("Ім'я"), 'Олена');
    await user.type(screen.getByLabelText('Прізвище'), 'Коваль');
    await user.type(screen.getByLabelText('Телефон'), '+49 151 2345678');
    await user.selectOptions(screen.getByLabelText('Улад'), 'УСП');
    await user.click(screen.getByRole('checkbox', { name: /Погоджуюсь/ }));
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    expect(await screen.findByText("Вкажіть ім'я дитини")).toBeTruthy();
    expect(screen.getByText('Вкажіть прізвище дитини')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Перевірте поля форми');
    expect(posts).toHaveLength(0);
  });

  it('AC-40: усі рядки відправлено — сторінка «Дякуємо», кошик і стан замовлення порожні', async () => {
    const user = userEvent.setup();
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    expect(await screen.findByText(/Дякуємо! Замовлення відправлено/)).toBeTruthy();
    expect(posts).toHaveLength(3);
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toEqual([]);
    expect(localStorage.getItem('plast-order-v1')).toBeNull();
    expect(posts[1].startedAt).toBeGreaterThanOrEqual(posts[0].startedAt);
  });

  it('AC-42: під час відправлення кнопка показує «Відправляємо… 1 з 3», повторні кліки не шлють зайвого', async () => {
    const user = userEvent.setup();
    installFetchStub((index) => (index === 2 ? new Promise<Response>(() => {}) : new Response('')));
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    const button = await screen.findByRole('button', { name: 'Відправляємо… 1 з 3' });
    await user.dblClick(button);
    expect(posts).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('AC-44, AC-46, AC-45: збій на 2-й позиції — сповіщення 1 з 3, елементи заблоковано, повтор шле лише решту', async () => {
    const user = userEvent.setup();
    installFetchStub(failAt(2));
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    const alert = await screen.findByRole('alert');
    const id = /Номер замовлення: (\d{8}-[0-9A-Z]{4})/.exec(alert.textContent ?? '')![1];
    expect(alert.textContent).toContain('Відправлено 1 з 3 позицій.');
    expect(within(alert).getByRole('button', { name: 'Спробувати ще' })).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Скопіювати текст замовлення' })).toBeTruthy();
    expect(screen.getByLabelText("Ім'я")).toHaveProperty('disabled', true);
    expect(screen.getByLabelText("Ім'я дитини")).toHaveProperty('disabled', true);

    installFetchStub();
    await user.click(within(alert).getByRole('button', { name: 'Спробувати ще' }));
    expect(await screen.findByText(/Дякуємо! Замовлення відправлено/)).toBeTruthy();
    expect(posts.map((p) => p.body.get('entry.1002'))).toEqual(['UPP-SHIRT-M', 'UPP-CAP-ONE']);
    expect(posts.every((p) => p.body.get('entry.1001') === id)).toBe(true);
  });

  it('AC-48, AC-49: після перезавантаження сповіщення з тим самим номером; порожні поля не дають повторити', async () => {
    const user = userEvent.setup();
    installFetchStub(failAt(2));
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    const before = (await screen.findByRole('alert')).textContent;

    cleanup();
    resetCartCache();
    resetPendingOrderCache();
    installFetchStub();
    render(<App />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(before);
    expect(screen.getByLabelText("Ім'я")).toHaveProperty('value', '');
    expect(screen.getByLabelText("Ім'я")).toHaveProperty('disabled', false);
    await user.click(within(alert).getByRole('button', { name: 'Спробувати ще' }));
    expect(await screen.findByText("Вкажіть ім'я дитини")).toBeTruthy();
    expect(posts).toHaveLength(0);
  });

  it('AC-50: збій на першій позиції — кошик і поля лишаються редагованими', async () => {
    const user = userEvent.setup();
    installFetchStub(failAt(1));
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Відправлено 0 з 3 позицій.');
    expect(screen.getByLabelText("Ім'я")).toHaveProperty('disabled', false);
    for (const b of screen.getAllByRole('button', { name: /^Прибрати/ })) expect(b).toHaveProperty('disabled', false);
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(3);
  });

  it('AC-5, AC-6, AC-26: «−» вимкнено на 1, «+» — на 20; «Прибрати» видаляє позицію з будь-якою кількістю', async () => {
    const user = userEvent.setup();
    seedCart([['UPP-SHIRT-S', 20], 'UPP-CAP-ONE']);
    window.location.hash = '#/cart';
    render(<App />);
    await screen.findByText('Позицій: 2 · штук: 21');
    expect(screen.getByRole('button', { name: 'Збільшити кількість: Сорочка УПП, S' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Зменшити кількість: Пілотка, one size' })).toHaveProperty('disabled', true);
    await user.click(screen.getByRole('button', { name: 'Прибрати Сорочка УПП, S' }));
    expect(screen.getByText('Позицій: 1 · штук: 1')).toBeTruthy();
  });

  it('AC-46: під час часткового замовлення лічильники та «Прибрати» на сторінці замовлення вимкнено', async () => {
    const user = userEvent.setup();
    installFetchStub(failAt(2));
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    await screen.findByRole('alert');
    for (const b of screen.getAllByRole('button', { name: /^(Прибрати|Збільшити|Зменшити)/ })) expect(b).toHaveProperty('disabled', true);
  });

  it('AC-47: під час часткового замовлення картки показують примітку й вимикають керування', async () => {
    const user = userEvent.setup();
    installFetchStub(failAt(2));
    await openCartWithThreeLines();
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    await screen.findByRole('alert');
    window.location.hash = '#/';
    const shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    expect(within(shirt).getByText('Спершу завершіть відправлення замовлення')).toBeTruthy();
    await user.click(within(shirt).getByRole('button', { name: /^S,/ }));
    expect(within(shirt).getByRole('button', { name: 'Збільшити кількість: Сорочка УПП, S' })).toHaveProperty('disabled', true);
    expect(within(shirt).getByRole('button', { name: 'Зменшити кількість: Сорочка УПП, S' })).toHaveProperty('disabled', true);
    expect(within(shirt).getByRole('button', { name: 'Прибрати' })).toHaveProperty('disabled', true);
    await user.click(within(shirt).getByRole('button', { name: /^L,/ }));
    expect(within(shirt).getByRole('button', { name: 'Додати до замовлення' })).toHaveProperty('disabled', true);
  });

  it('AC-16, AC-27: кількість зі сторінки замовлення видно на картці, і вона зберігається після перезавантаження', async () => {
    const user = userEvent.setup();
    seedCart(['UPP-SHIRT-S']);
    window.location.hash = '#/cart';
    render(<App />);
    await screen.findByText('Позицій: 1 · штук: 1');
    const inc = screen.getByRole('button', { name: 'Збільшити кількість: Сорочка УПП, S' });
    await user.click(inc);
    await user.click(inc);
    window.location.hash = '#/';
    let shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    await user.click(within(shirt).getByRole('button', { name: /^S,/ }));
    expect(within(shirt).getByRole('button', { name: /^S,/ }).textContent).toBe('✓ S ×3');

    cleanup();
    resetCartCache();
    render(<App />);
    shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    expect(within(shirt).getByRole('button', { name: /^S,/ }).textContent).toBe('✓ S ×3');
  });

  it('AC-25: значок у шапці — сума штук, доступна назва «Кошик, 3 штуки»', async () => {
    seedCart([['UPP-SHIRT-M', 2], 'UPP-SHIRT-L']);
    render(<App />);
    const link = await screen.findByRole('link', { name: 'Кошик, 3 штуки' });
    expect(link.textContent).toContain('3');
    seedCart(['UPP-SHIRT-S']);
    cleanup();
    render(<App />);
    expect(await screen.findByRole('link', { name: 'Кошик, 1 штука' })).toBeTruthy();
  });

  it('AC-53, AC-54: сторінка «Дякуємо» показує номер, позиції, штуки та суму, що збігається з сумою замовлення', async () => {
    const user = userEvent.setup();
    seedCart([['UPP-SHIRT-S', 2]]);
    window.location.hash = '#/cart';
    render(<App />);
    await screen.findByText('Позицій: 1 · штук: 2');
    await fillContactForm(user);
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    await screen.findByText(/Дякуємо! Замовлення відправлено/);
    const summary = screen.getByText(/^Замовлення \d{8}-/).textContent!.replace(/\s/g, ' ');
    expect(summary).toMatch(/^Замовлення \d{8}-[2-9A-HJKMNP-Z]{4} · 1 позиція, 2 шт\. · координатор зателефонує на \+49 151 2345678$/);
    const total = screen.getAllByText(/Разом/).map((e) => e.textContent!.replace(/\s/g, ' '));
    expect(total).toEqual(['Разом: 1 860 €']);
  });
});
