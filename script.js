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

const baseCurrency = "USD";
const fallbackRates = {
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
let exchangeRate = fallbackRates.PHP;

const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencySelect.value,
    minimumFractionDigits: 2,
    maximumFractionDigits: currencySelect.value === "JPY" || currencySelect.value === "KRW" ? 0 : 2,
  }).format(amount * exchangeRate);
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
}

async function updateExchangeRate() {
  const selectedCurrency = currencySelect.value;

  if (selectedCurrency === baseCurrency) {
    exchangeRate = 1;
    rateStatus.textContent = "Showing USD totals.";
    calculate();
    return;
  }

  exchangeRate = fallbackRates[selectedCurrency] || 1;
  rateStatus.textContent = `Loading live ${baseCurrency} to ${selectedCurrency} rate...`;
  calculate();

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${baseCurrency.toLowerCase()}/${selectedCurrency.toLowerCase()}`,
    );

    if (!response.ok) {
      throw new Error("Rate request failed");
    }

    const data = await response.json();
    exchangeRate = toNumber(data.rate) || exchangeRate;
    rateStatus.textContent = `Live rate: 1 ${baseCurrency} = ${exchangeRate.toFixed(4)} ${selectedCurrency}`;
    calculate();
  } catch (error) {
    rateStatus.textContent = `Using fallback rate: 1 ${baseCurrency} = ${exchangeRate.toFixed(4)} ${selectedCurrency}`;
    calculate();
  }
}

function addViewRow(value = "") {
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
  input.focus();
}

addViewButton.addEventListener("click", () => addViewRow());
resetButton.addEventListener("click", () => {
  payPerViewInput.value = "1.5";
  perViewsInput.value = "1000";
  taxRateInput.value = "10";
  currencySelect.value = "PHP";
  viewList.replaceChildren();
  addViewRow();
  updateExchangeRate();
});

payPerViewInput.addEventListener("input", calculate);
perViewsInput.addEventListener("input", calculate);
taxRateInput.addEventListener("input", calculate);
currencySelect.addEventListener("change", updateExchangeRate);

addViewRow();
updateExchangeRate();
