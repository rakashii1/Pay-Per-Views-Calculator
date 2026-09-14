const viewList = document.querySelector("#viewList");
const addViewButton = document.querySelector("#addViewButton");
const resetButton = document.querySelector("#resetButton");
const payPerViewInput = document.querySelector("#payPerView");
const perViewsInput = document.querySelector("#perViews");
const taxRateInput = document.querySelector("#taxRate");
const totalViewsOutput = document.querySelector("#totalViews");
const grossPayOutput = document.querySelector("#grossPay");
const taxAmountOutput = document.querySelector("#taxAmount");
const netPayOutput = document.querySelector("#netPay");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const integer = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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
  grossPayOutput.textContent = currency.format(grossPay);
  taxAmountOutput.textContent = currency.format(taxAmount);
  netPayOutput.textContent = currency.format(netPay);
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
  viewList.replaceChildren();
  addViewRow();
});

payPerViewInput.addEventListener("input", calculate);
perViewsInput.addEventListener("input", calculate);
taxRateInput.addEventListener("input", calculate);

addViewRow();
