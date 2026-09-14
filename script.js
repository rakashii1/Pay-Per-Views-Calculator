const viewList = document.querySelector("#viewList");
const addViewButton = document.querySelector("#addViewButton");
const resetButton = document.querySelector("#resetButton");
const payPerViewInput = document.querySelector("#payPerView");
const perViewsInput = document.querySelector("#perViews");
const taxRateInput = document.querySelector("#taxRate");
const currencySelect = document.querySelector("#currencySelect");
const rateStatus = document.querySelector("#rateStatus");
const totalViewsOutput = document.querySelector("#totalViews");
const grossPayOutput = document.querySelector("#grossPay");
const taxAmountOutput = document.querySelector("#taxAmount");
const netPayOutput = document.querySelector("#netPay");

const storageKey = "rakashii-view-pay-calculator";
const fallbackUsdRates = {
  AUD: 1.52,
  CAD: 1.38,
  EUR: 0.86,
  GBP: 0.74,
  INR: 83.1,
  JPY: 154.06,
  KRW: 1378.5,
  PHP: 62.84,
  SGD: 1.29,
  USD: 1,
};
const payCurrency = "USD";
let exchangeRate = fallbackUsdRates.PHP;

const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getViewValues() {
  return [...viewList.querySelectorAll(".view-input input")].map((input) => input.value);
}

function saveCalculator() {
  const state = {
    payAmount: payPerViewInput.value,
    perViews: perViewsInput.value,
    taxRate: taxRateInput.value,
    displayCurrency: currencySelect.value,
    viewBatches: getViewValues(),
  };

  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadCalculator() {
  try {
    const savedState = JSON.parse(localStorage.getItem(storageKey));

    if (!savedState) {
      return false;
    }

    payPerViewInput.value = savedState.payAmount || "1.5";
    perViewsInput.value = savedState.perViews || "1000";
    taxRateInput.value = savedState.taxRate || "10";
    currencySelect.value = savedState.displayCurrency || "PHP";
    viewList.replaceChildren();

    const savedBatches = Array.isArray(savedState.viewBatches)
      ? savedState.viewBatches.filter((value) => value !== "")
      : [];

    if (savedBatches.length === 0) {
      addViewRow();
      return true;
    }

    savedBatches.forEach((value) => addViewRow(value, false));
    return true;
  } catch (error) {
    localStorage.removeItem(storageKey);
    return false;
  }
}

function formatCurrency(amount) {
  const usdAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: payCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (currencySelect.value === payCurrency) {
    return usdAmount;
  }

  const convertedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencySelect.value,
    minimumFractionDigits: 2,
    maximumFractionDigits: currencySelect.value === "JPY" || currencySelect.value === "KRW" ? 0 : 2,
  }).format(amount * exchangeRate);

  return `${usdAmount} / ${convertedAmount}`;
}

function renumberRows() {
  [...viewList.querySelectorAll(".view-row")].forEach((row, index) => {
    row.querySelector(".view-number").textContent = index + 1;
    row.querySelector("label").setAttribute("aria-label", `Views batch ${index + 1}`);
  });
}

function updateRemoveButtons() {
  const buttons = viewList.querySelectorAll(".remove-button");
  buttons.forEach((button) => {
    button.disabled = buttons.length === 1;
  });
}

function calculate() {
  const views = [...viewList.querySelectorAll(".view-input input")].reduce(
    (total, input) => total + toNumber(input.value),
    0,
  );
  const payAmount = toNumber(payPerViewInput.value);
  const perViews = Math.max(toNumber(perViewsInput.value), 1);
  const taxRate = toNumber(taxRateInput.value) / 100;
  const grossPay = (views / perViews) * payAmount;
  const taxAmount = grossPay * taxRate;
  const netPay = Math.max(grossPay - taxAmount, 0);

  totalViewsOutput.textContent = integer.format(views);
  grossPayOutput.textContent = formatCurrency(grossPay);
  taxAmountOutput.textContent = formatCurrency(taxAmount);
  netPayOutput.textContent = formatCurrency(netPay);
  saveCalculator();
}

async function updateExchangeRate() {
  const displayCurrency = currencySelect.value;

  if (displayCurrency === payCurrency) {
    exchangeRate = 1;
    rateStatus.textContent = `Showing ${displayCurrency} totals.`;
    calculate();
    return;
  }

  exchangeRate = fallbackUsdRates[displayCurrency] || 1;
  rateStatus.textContent = `Loading latest ${payCurrency} to ${displayCurrency} rate...`;
  calculate();

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${payCurrency.toLowerCase()}/${displayCurrency.toLowerCase()}`,
    );

    if (!response.ok) {
      throw new Error("Rate request failed");
    }

    const data = await response.json();
    exchangeRate = toNumber(data.rate) || exchangeRate;
    rateStatus.textContent = `Latest rate: 1 ${payCurrency} = ${exchangeRate.toFixed(4)} ${displayCurrency}`;
    calculate();
  } catch (error) {
    rateStatus.textContent = `Using fallback rate: 1 ${payCurrency} = ${exchangeRate.toFixed(4)} ${displayCurrency}`;
    calculate();
  }
}

function addViewRow(value = "", shouldFocus = true) {
  const row = document.createElement("div");
  row.className = "view-row";
  row.innerHTML = `
    <span class="view-number"></span>
    <label class="view-input">
      <input type="number" min="0" step="1" inputmode="numeric" placeholder="Enter views" value="${value}">
    </label>
    <button class="remove-button" type="button" aria-label="Remove this views batch" title="Remove views batch">-</button>
  `;

  const input = row.querySelector("input");
  input.addEventListener("input", calculate);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addViewRow();
    }
  });
  row.querySelector(".remove-button").addEventListener("click", () => {
    row.remove();
    renumberRows();
    updateRemoveButtons();
    calculate();
  });

  viewList.append(row);
  renumberRows();
  updateRemoveButtons();
  calculate();

  if (shouldFocus) {
    input.focus();
  }
}

addViewButton.addEventListener("click", () => addViewRow());
resetButton.addEventListener("click", () => {
  payPerViewInput.value = "1.5";
  perViewsInput.value = "1000";
  taxRateInput.value = "10";
  currencySelect.value = "PHP";
  localStorage.removeItem(storageKey);
  viewList.replaceChildren();
  addViewRow();
  updateExchangeRate();
});

payPerViewInput.addEventListener("input", calculate);
perViewsInput.addEventListener("input", calculate);
taxRateInput.addEventListener("input", calculate);
currencySelect.addEventListener("change", updateExchangeRate);

if (!loadCalculator()) {
  addViewRow();
}
updateExchangeRate();
