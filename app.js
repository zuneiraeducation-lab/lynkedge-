/**
 * LynkEdge production console logic.
 * Supports fully independent option lists for Product Name vs Material Name,
 * Previous Product vs Previous Material, and Batch No. vs SAP Batch No.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('productionForm');
  const submitBtn = document.getElementById('submitBtn');
  const addRowBtn = document.getElementById('addRowBtn');
  const customRowsContainer = document.getElementById('customRowsContainer');
  const feedbackBanner = document.getElementById('feedbackBanner');
  const feedbackText = document.getElementById('feedbackText');
  const feedbackIcon = document.getElementById('feedbackIcon');
  const statusModal = document.getElementById('statusModal');
  const statusModalTitle = document.getElementById('statusModalTitle');
  const statusOptionInput = document.getElementById('statusOptionInput');
  const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
  const cancelStatusBtn = document.getElementById('cancelStatusBtn');
  const confirmStatusBtn = document.getElementById('confirmStatusBtn');
  const editLabelsBtn = document.getElementById('editLabelsBtn');
  const accountSettingsPanel = document.getElementById('accountSettingsPanel');
  const changePasswordsBtn = document.getElementById('changePasswordsBtn');
  const passwordModal = document.getElementById('passwordModal');
  const closePasswordModalBtn = document.getElementById('closePasswordModalBtn');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  const submitPasswordBtn = document.getElementById('submitPasswordBtn');
  const passwordFeedback = document.getElementById('passwordFeedback');
  const changeUsernamesBtn = document.getElementById('changeUsernamesBtn');
  const usernameModal = document.getElementById('usernameModal');
  const closeUsernameModalBtn = document.getElementById('closeUsernameModalBtn');
  const cancelUsernameBtn = document.getElementById('cancelUsernameBtn');
  const submitUsernameBtn = document.getElementById('submitUsernameBtn');
  const usernameFields = document.getElementById('usernameFields');
  const usernameFeedback = document.getElementById('usernameFeedback');
  const removeConfirmModal = document.getElementById('removeConfirmModal');
  const closeRemoveConfirmBtn = document.getElementById('closeRemoveConfirmBtn');
  const cancelRemoveBtn = document.getElementById('cancelRemoveBtn');
  const confirmRemoveBtn = document.getElementById('confirmRemoveBtn');
  const submitConfirmModal = document.getElementById('submitConfirmModal');
  const closeSubmitConfirmBtn = document.getElementById('closeSubmitConfirmBtn');
  const cancelSubmitBtn = document.getElementById('cancelSubmitBtn');
  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');
  let usernameMap = {};
  let fieldNamesEditMode = false;
  let pendingRemoval = null;
  let pendingSubmission = null;

  const permissions = {
    basic_update: false,
    manage_options: false,
    edit_field_names: false,
    edit_unit_info: false,
    edit_unit_number: false,
    manage_rows: false,
    manage_structure: false,
    manage_accounts: false
  };

  const fieldMap = {
    area: document.getElementById('area'),
    unit_number: document.getElementById('unitNumber'),
    document_number: document.getElementById('documentNumber'),
    equipment_codes: document.getElementById('equipmentCodes'),
    status: document.getElementById('status'),
    previous_name_value: document.getElementById('previousNameValue'),
    current_name_value: document.getElementById('currentNameValue'),
    batch_value: document.getElementById('batchValue'),
    cleaning_valid_up_to: document.getElementById('cleaningValidUpTo'),
    clean_before_datetime: document.getElementById('cleanBeforeDatetime'),
    updated_by: document.getElementById('updatedBy'),
    updated_on: document.getElementById('updatedOn')
  };

  const pickerElements = {
    status: {
      select: document.getElementById('status'),
      pickerBtn: document.getElementById('statusPickerBtn'),
      optionsList: document.getElementById('statusOptionsList'),
      addBtn: document.getElementById('addStatusOptionBtn')
    },
    previous_name: {
      select: document.getElementById('previousNameValue'),
      pickerBtn: document.getElementById('previousNamePickerBtn'),
      optionsList: document.getElementById('previousNameOptionsList'),
      addBtn: document.getElementById('addPreviousNameOptionBtn')
    },
    current_name: {
      select: document.getElementById('currentNameValue'),
      pickerBtn: document.getElementById('currentNamePickerBtn'),
      optionsList: document.getElementById('currentNameOptionsList'),
      addBtn: document.getElementById('addCurrentNameOptionBtn')
    },
    batch: {
      select: document.getElementById('batchValue'),
      pickerBtn: document.getElementById('batchPickerBtn'),
      optionsList: document.getElementById('batchOptionsList'),
      addBtn: document.getElementById('addBatchOptionBtn')
    }
  };

  // Independent options store for all dropdown types
  const optionsStore = {
    status: [],
    previous_product_name: [],
    previous_material_name: [],
    product_name: [],
    material_name: [],
    batch_number: [],
    sap_batch_number: []
  };

  // Independent active values store
  const valuesStore = {
    status: '',
    previous_product_name: '',
    previous_material_name: '',
    product_name: '',
    material_name: '',
    batch_number: '',
    sap_batch_number: ''
  };
  const selectableFields = {
    previous_name: [],
    current_name: [],
    batch: []
  };
  const selectedFieldKeys = {
    previous_name: '',
    current_name: '',
    batch: ''
  };
  const fieldGroupConfig = {
    previous_name: { container: 'previousNameFields', radioName: 'previousNameType', picker: 'previous_name' },
    current_name: { container: 'currentNameFields', radioName: 'currentNameType', picker: 'current_name' },
    batch: { container: 'batchFields', radioName: 'batchType', picker: 'batch' }
  };

  let activeModalTarget = null;

  function closeRemoveConfirmModal() {
    if (removeConfirmModal) removeConfirmModal.classList.add('hidden');
    pendingRemoval = null;
  }

  function requestRemoval(removal) {
    pendingRemoval = removal;
    if (removeConfirmModal) removeConfirmModal.classList.remove('hidden');
  }

  if (closeRemoveConfirmBtn) closeRemoveConfirmBtn.addEventListener('click', closeRemoveConfirmModal);
  if (cancelRemoveBtn) cancelRemoveBtn.addEventListener('click', closeRemoveConfirmModal);
  if (confirmRemoveBtn) {
    confirmRemoveBtn.addEventListener('click', () => {
      const removal = pendingRemoval;
      closeRemoveConfirmModal();
      if (removal) removal();
    });
  }

  function closeSubmitConfirmModal() {
    if (submitConfirmModal) submitConfirmModal.classList.add('hidden');
    pendingSubmission = null;
  }

  function openSubmitConfirmModal(submission) {
    pendingSubmission = submission;
    if (submitConfirmModal) submitConfirmModal.classList.remove('hidden');
  }

  if (closeSubmitConfirmBtn) closeSubmitConfirmBtn.addEventListener('click', closeSubmitConfirmModal);
  if (cancelSubmitBtn) cancelSubmitBtn.addEventListener('click', closeSubmitConfirmModal);
  if (confirmSubmitBtn) {
    confirmSubmitBtn.addEventListener('click', async () => {
      const submission = pendingSubmission;
      closeSubmitConfirmModal();
      if (submission) await submission();
    });
  }

  function showFeedback(type, message) {
    if (!feedbackBanner || !feedbackText || !feedbackIcon) return;
    feedbackBanner.className = `feedback-banner ${type}`;
    feedbackText.textContent = message;

    if (type === 'success') {
      feedbackIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
    } else {
      feedbackIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>`;
    }
  }

  function hideFeedback() {
    if (feedbackBanner) feedbackBanner.className = 'feedback-banner hidden';
  }

  function selectedValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : '';
  }

  function getActiveSubKey(pickerKey) {
    if (pickerKey === 'status') return 'status';
    if (pickerKey === 'previous_name') return selectedFieldKeys.previous_name;
    if (pickerKey === 'current_name') return selectedFieldKeys.current_name;
    if (pickerKey === 'batch') return selectedFieldKeys.batch;
    return pickerKey;
  }

  function renderSelectableFields(group) {
    const config = fieldGroupConfig[group];
    const container = document.getElementById(config.container);
    if (!container) return;
    const currentKey = getActiveSubKey(config.picker);
    container.innerHTML = '';
    selectableFields[group].forEach((field) => {
      const item = document.createElement('span');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = config.radioName;
      radio.value = field.key;
      radio.checked = field.key === currentKey;
      radio.addEventListener('change', () => {
        if (radio.checked) selectedFieldKeys[group] = field.key;
        renderPicker(config.picker);
      });
      const label = document.createElement('span');
      label.className = 'selectable-field-label';
      if (fieldNamesEditMode && permissions.edit_field_names) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'selectable-field-label-input';
        input.value = field.label;
        input.dataset.fieldKey = field.key;
        input.setAttribute('aria-label', `Edit ${field.label} field name`);
        input.addEventListener('input', () => {
          field.label = input.value;
        });
        label.appendChild(input);
      } else {
        label.textContent = ` ${field.label}`;
      }
      item.append(radio, label);
      container.appendChild(item);
    });

    if (permissions.manage_options && fieldNamesEditMode) {
      const controls = document.createElement('div');
      controls.className = 'field-name-controls';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'field-name-control field-name-remove';
      remove.textContent = '× Remove';
      remove.title = 'Delete selected field name';
      remove.disabled = !currentKey;
      remove.addEventListener('click', () => requestRemoval(() => {
          const selectedKey = selectedFieldKeys[group];
          if (!selectedKey) return;
          const selectedIndex = selectableFields[group].findIndex((field) => field.key === selectedKey);
          if (selectedIndex < 0) return;
          selectableFields[group].splice(selectedIndex, 1);
          selectedFieldKeys[group] = selectableFields[group].length
            ? selectableFields[group][selectableFields[group].length - 1].key
            : '';
          renderSelectableFields(group);
          renderPicker(config.picker);
        }));

      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'field-name-control field-name-add';
      add.textContent = '+ Add field name';
      add.title = 'Add field name';
      add.addEventListener('click', () => {
        openFieldNameModal(group);
      });

      controls.append(remove, add);
      container.appendChild(controls);
    }
  }

  function renderAllSelectableFields() {
    Object.keys(fieldGroupConfig).forEach(renderSelectableFields);
  }

  function syncSelectableFieldLabels() {
    document.querySelectorAll('.selectable-field-label-input').forEach((input) => {
      Object.values(selectableFields).forEach((group) => {
        const field = group.find((item) => item.key === input.dataset.fieldKey);
        if (field && input.value.trim()) field.label = input.value.trim();
      });
    });
  }

  function renderStandardFieldEditors(editing) {
    document.querySelectorAll('[data-label-key]').forEach((label) => {
      if (fieldGroupConfig[label.dataset.labelKey]) return;
      const editor = label.querySelector('.field-label-editor');
      if (editing && !editor) {
        const currentText = label.textContent.replace(/\s*:\s*$/, '').trim();
        label.textContent = '';
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'field-label-editor';
        input.value = currentText;
        input.setAttribute('aria-label', `Edit ${currentText} field name`);
        label.appendChild(input);
      } else if (!editing && editor) {
        const nextText = editor.value.trim() || editor.defaultValue;
        label.textContent = `${nextText} :`;
      }
    });
  }

  function getModalConfig(subKey) {
    const configs = {
      status: { title: 'Add new status', placeholder: 'Type new status' },
      previous_product_name: { title: 'Add new Previous Product Name', placeholder: 'Type previous product name' },
      previous_material_name: { title: 'Add new Previous Material Name', placeholder: 'Type previous material name' },
      product_name: { title: 'Add new Product Name', placeholder: 'Type product name' },
      material_name: { title: 'Add new Material Name', placeholder: 'Type material name' },
      batch_number: { title: 'Add new Batch No.', placeholder: 'Type batch number' },
      sap_batch_number: { title: 'Add new SAP Batch No.', placeholder: 'Type SAP batch number' }
    };
    return configs[subKey] || { title: 'Add new option', placeholder: 'Type option value' };
  }

  function getDefaultLabel(pickerKey) {
    return pickerKey === 'status' ? 'Select Status' : 'Select an option';
  }

  function syncNativeSelect(select, options, selectedVal, defaultLabel) {
    if (!select) return;
    select.innerHTML = '';
    select.add(new Option(defaultLabel, '', true, !selectedVal));
    options.forEach((opt) => {
      select.add(new Option(opt, opt, false, opt === selectedVal));
    });
    select.value = selectedVal || '';
  }

  function renderPicker(pickerKey) {
    const elements = pickerElements[pickerKey];
    if (!elements || !elements.pickerBtn || !elements.optionsList) return;

    const subKey = getActiveSubKey(pickerKey);
    const options = Array.isArray(optionsStore[subKey]) ? optionsStore[subKey] : [];
    const currentVal = valuesStore[subKey] || '';
    const defaultLabel = getDefaultLabel(pickerKey);

    // Sync underlying select
    syncNativeSelect(elements.select, options, currentVal, defaultLabel);

    // Update button text
    elements.pickerBtn.innerHTML = '';
    const textSpan = document.createElement('span');
    textSpan.className = 'picker-btn-text';
    textSpan.textContent = currentVal || defaultLabel;
    const arrowSpan = document.createElement('span');
    arrowSpan.textContent = '▾';
    elements.pickerBtn.append(textSpan, arrowSpan);

    // Render options list
    elements.optionsList.innerHTML = '';
    if (options.length === 0) {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'status-option-row empty-option-row';
      emptyRow.textContent = 'No options added yet';
      emptyRow.style.padding = '8px 12px';
      emptyRow.style.color = '#71879d';
      emptyRow.style.fontSize = '0.85rem';
      elements.optionsList.appendChild(emptyRow);
      return;
    }

    options.forEach((opt) => {
      const optionRow = document.createElement('div');
      optionRow.className = 'status-option-row';

      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'status-option-value';
      optionButton.textContent = opt;
      if (opt === currentVal) {
        optionButton.style.fontWeight = '700';
        optionButton.style.color = '#0876ed';
        optionButton.style.background = '#eef6fc';
      }

      optionButton.addEventListener('click', () => {
        valuesStore[subKey] = opt;
        renderPicker(pickerKey);
        elements.optionsList.classList.add('hidden');
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'status-option-delete';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', `Remove ${opt}`);
      deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        requestRemoval(() => {
          optionsStore[subKey] = optionsStore[subKey].filter((item) => item !== opt);
          if (valuesStore[subKey] === opt) {
            valuesStore[subKey] = '';
          }
          renderPicker(pickerKey);
        });
      });

      if (permissions.manage_options) {
        optionRow.append(optionButton, deleteButton);
      } else {
        optionRow.append(optionButton);
      }
      elements.optionsList.appendChild(optionRow);
    });
  }

  function renderAllPickers() {
    ['status', 'previous_name', 'current_name', 'batch'].forEach(renderPicker);
  }

  // Radio button switch listeners
  document.addEventListener('change', (event) => {
    if (event.target.matches('input[name="currentNameType"]')) renderPicker('current_name');
    if (event.target.matches('input[name="previousNameType"]')) renderPicker('previous_name');
    if (event.target.matches('input[name="batchType"]')) renderPicker('batch');
  });

  // Modal open/close handling
  function openOptionModal(pickerKey) {
    const subKey = getActiveSubKey(pickerKey);
    const config = getModalConfig(subKey);
    activeModalTarget = { type: 'option', pickerKey, subKey };

    if (statusModalTitle) statusModalTitle.textContent = config.title;
    if (statusOptionInput) {
      statusOptionInput.placeholder = config.placeholder;
      statusOptionInput.value = '';
    }
    if (statusModal) statusModal.classList.remove('hidden');
    if (statusOptionInput) statusOptionInput.focus();
  }

  function openFieldNameModal(group) {
    activeModalTarget = { type: 'field-name', group };
    if (statusModalTitle) statusModalTitle.textContent = 'Add new field name';
    if (statusOptionInput) {
      statusOptionInput.placeholder = 'Type new field name';
      statusOptionInput.value = '';
    }
    if (statusModal) statusModal.classList.remove('hidden');
    if (statusOptionInput) statusOptionInput.focus();
  }

  function closeOptionModal() {
    if (statusModal) statusModal.classList.add('hidden');
    if (statusOptionInput) statusOptionInput.value = '';
    activeModalTarget = null;
  }

  if (confirmStatusBtn && statusOptionInput) {
    confirmStatusBtn.addEventListener('click', () => {
      if (!activeModalTarget) return;
      const val = statusOptionInput.value.trim();
      if (val && activeModalTarget.type === 'field-name') {
        const { group } = activeModalTarget;
        const config = fieldGroupConfig[group];
        const keyBase = `${group}_${val.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        let key = keyBase;
        let suffix = 2;
        while (selectableFields[group].some((field) => field.key === key)) key = `${keyBase}_${suffix++}`;
        selectableFields[group].push({ key, label: val });
        selectedFieldKeys[group] = key;
        optionsStore[key] = [];
        valuesStore[key] = '';
        renderSelectableFields(group);
        renderPicker(config.picker);
        closeOptionModal();
      } else if (val && activeModalTarget.type === 'option') {
        const { pickerKey, subKey } = activeModalTarget;
        if (!optionsStore[subKey].includes(val)) {
          optionsStore[subKey].push(val);
        }
        valuesStore[subKey] = val;
        renderPicker(pickerKey);
        closeOptionModal();
      }
    });

    statusOptionInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmStatusBtn.click();
      }
      if (event.key === 'Escape') {
        closeOptionModal();
      }
    });
  }

  if (closeStatusModalBtn) closeStatusModalBtn.addEventListener('click', closeOptionModal);
  if (cancelStatusBtn) cancelStatusBtn.addEventListener('click', closeOptionModal);

  // Setup picker button toggle and add option button click
  Object.entries(pickerElements).forEach(([key, elements]) => {
    if (elements.pickerBtn && elements.optionsList) {
      elements.pickerBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        Object.entries(pickerElements).forEach(([otherKey, otherElements]) => {
          if (otherKey !== key && otherElements.optionsList) {
            otherElements.optionsList.classList.add('hidden');
          }
        });
        elements.optionsList.classList.toggle('hidden');
      });
    }

    if (elements.addBtn) {
      elements.addBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        openOptionModal(key);
      });
    }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (event) => {
    Object.values(pickerElements).forEach((elements) => {
      if (elements.optionsList && !elements.optionsList.contains(event.target) && (!elements.pickerBtn || !elements.pickerBtn.contains(event.target))) {
        elements.optionsList.classList.add('hidden');
      }
    });
  });

  // Custom Rows Logic
  function createCustomRow(initialLabel = '', initialValue = '') {
    const row = document.createElement('div');
    row.className = 'custom-row';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'custom-label';
    labelInput.placeholder = 'Field / Label';
    labelInput.value = initialLabel;

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'custom-value';
    valueInput.placeholder = 'Value';
    valueInput.value = initialValue;

    const typeSelect = document.createElement('select');
    typeSelect.className = 'custom-type';
    typeSelect.setAttribute('aria-label', 'Custom row value type');
    typeSelect.innerHTML = '<option value="text">Text</option><option value="date">Date</option><option value="datetime-local">Date &amp; time</option>';

    const valueCell = document.createElement('div');
    valueCell.className = 'custom-value-cell';
    valueCell.append(valueInput, typeSelect);

    typeSelect.addEventListener('change', () => {
      const nextValue = valueCell.querySelector('.custom-value').value;
      const nextInput = document.createElement('input');
      nextInput.type = typeSelect.value;
      nextInput.className = 'custom-value';
      nextInput.placeholder = typeSelect.value === 'text' ? 'Value' : '';
      if (typeSelect.value === 'datetime-local' && /^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
        nextInput.value = `${nextValue}T00:00`;
      } else if (typeSelect.value === 'date' && nextValue.includes('T')) {
        nextInput.value = nextValue.slice(0, 10);
      } else {
        nextInput.value = nextValue;
      }
      valueCell.replaceChildren(nextInput, typeSelect);
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-row-btn';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', 'Remove custom row');
    removeBtn.addEventListener('click', () => requestRemoval(() => row.remove()));

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'confirm-row-btn';
    confirmBtn.textContent = '✓';
    confirmBtn.setAttribute('aria-label', 'Confirm custom row');
    confirmBtn.addEventListener('click', () => {
      const currentValueInput = valueCell.querySelector('.custom-value');
      if (!labelInput.value.trim() || !currentValueInput || !currentValueInput.value.trim()) {
        labelInput.focus();
        return;
      }
      const isConfirmed = row.classList.toggle('confirmed');
      labelInput.readOnly = isConfirmed;
      if (currentValueInput) currentValueInput.readOnly = isConfirmed;
      typeSelect.disabled = isConfirmed;
      confirmBtn.textContent = isConfirmed ? '✎' : '✓';
      confirmBtn.setAttribute('aria-label', isConfirmed ? 'Edit custom row' : 'Confirm custom row');
    });

    const actionCell = document.createElement('div');
    actionCell.className = 'custom-row-actions';
    if (permissions.manage_rows) {
      actionCell.append(confirmBtn, removeBtn);
    }
    labelInput.readOnly = !permissions.manage_rows;
    typeSelect.disabled = !permissions.manage_rows;

    row.append(labelInput, valueCell, actionCell);
    return row;
  }

  function getCustomRows() {
    if (!customRowsContainer) return [];
    const rows = [];
    customRowsContainer.querySelectorAll('.custom-row').forEach((row) => {
      const labelField = row.querySelector('.custom-label');
      const valueField = row.querySelector('.custom-value');
      if (!labelField || !valueField) return;
      const label = labelField.value.trim();
      const value = valueField.value.trim();
      if (!label && !value) return;
      const typeField = row.querySelector('.custom-type');
      rows.push({ label, value, type: typeField ? typeField.value : 'text' });
    });
    return rows;
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return Array.from(new Set(list.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  function populateFormFromState(data) {
    // Populate simple inputs
    ['area', 'unit_number', 'document_number', 'equipment_codes', 'cleaning_valid_up_to', 'clean_before_datetime', 'updated_by', 'updated_on'].forEach((key) => {
      const field = fieldMap[key];
      if (!field || data[key] === undefined || data[key] === null) return;
      field.value = String(data[key]);
    });

    document.querySelectorAll('[data-label-key]').forEach((label) => {
      const key = label.dataset.labelKey;
      if (fieldGroupConfig[key]) return;
      if (data.field_labels && typeof data.field_labels[key] === 'string') {
        label.textContent = `${data.field_labels[key].replace(/\s*:\s*$/, '').trim()} :`;
      }
    });

    // Populate options store
    optionsStore.status = normalizeList(data.status_options);
    optionsStore.product_name = normalizeList(data.product_name_options || (data.product_name ? [data.product_name] : []));
    optionsStore.material_name = normalizeList(data.material_name_options || (data.material_name ? [data.material_name] : []));
    optionsStore.previous_product_name = normalizeList(data.previous_product_name_options || (data.previous_product_name ? [data.previous_product_name] : []));
    optionsStore.previous_material_name = normalizeList(data.previous_material_name_options || (data.previous_material_name ? [data.previous_material_name] : []));
    optionsStore.batch_number = normalizeList(data.batch_number_options || (data.batch_number ? [data.batch_number] : []));
    optionsStore.sap_batch_number = normalizeList(data.sap_batch_number_options || (data.sap_batch_number ? [data.sap_batch_number] : []));
    Object.keys(fieldGroupConfig).forEach((group) => {
      selectableFields[group].splice(0, selectableFields[group].length, ...(Array.isArray(data.selectable_fields?.[group]) ? data.selectable_fields[group] : []));
      selectableFields[group].forEach((field) => {
        optionsStore[field.key] = normalizeList(data.selectable_field_options?.[field.key] || []);
        valuesStore[field.key] = String(data.selectable_field_values?.[field.key] || '');
      });
    });

    // Populate values store
    valuesStore.status = String(data.status || '').trim();
    valuesStore.product_name = String(data.product_name || '').trim();
    valuesStore.material_name = String(data.material_name || '').trim();
    valuesStore.previous_product_name = String(data.previous_product_name || '').trim();
    valuesStore.previous_material_name = String(data.previous_material_name || '').trim();
    valuesStore.batch_number = String(data.batch_number || '').trim();
    valuesStore.sap_batch_number = String(data.sap_batch_number || '').trim();

    // Ensure non-empty active values exist in their respective option lists
    Object.keys(valuesStore).forEach((key) => {
      const val = valuesStore[key];
      if (val && !optionsStore[key].includes(val)) {
        optionsStore[key].push(val);
      }
    });

    // Determine and set active radio buttons
    const previousKeys = selectableFields.previous_name.map((field) => field.key);
    const currentKeys = selectableFields.current_name.map((field) => field.key);
    const batchKeys = selectableFields.batch.map((field) => field.key);
    const previousKey = previousKeys.includes(data.previous_name_type) ? data.previous_name_type : (previousKeys[0] || '');
    const currentKey = currentKeys.includes(data.current_name_type) ? data.current_name_type : (currentKeys[0] || '');
    const batchKey = batchKeys.includes(data.batch_type) ? data.batch_type : (batchKeys[0] || '');
    selectedFieldKeys.previous_name = previousKey;
    selectedFieldKeys.current_name = currentKey;
    selectedFieldKeys.batch = batchKey;

    renderAllSelectableFields();
    const previousRadio = document.querySelector(`input[name="previousNameType"][value="${previousKey}"]`);
    const currentRadio = document.querySelector(`input[name="currentNameType"][value="${currentKey}"]`);
    const batchRadio = document.querySelector(`input[name="batchType"][value="${batchKey}"]`);
    if (previousRadio) previousRadio.checked = true;
    if (currentRadio) currentRadio.checked = true;
    if (batchRadio) batchRadio.checked = true;
    // Render all pickers with the populated independent options and values
    renderAllPickers();

    // Populate custom rows
    if (!customRowsContainer) return;
    customRowsContainer.innerHTML = '';
    const customRows = Array.isArray(data.custom_rows) ? data.custom_rows : [];
    customRows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const label = typeof row.label === 'string' ? row.label : '';
      const value = typeof row.value === 'string' ? row.value : '';
      const customRow = createCustomRow(label, value);
      const typeField = customRow.querySelector('.custom-type');
      if (typeField && ['text', 'date', 'datetime-local'].includes(row.type)) {
        typeField.value = row.type;
        typeField.dispatchEvent(new Event('change'));
      }
      customRowsContainer.appendChild(customRow);
    });
  }

  async function fetchStatus() {
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      populateFormFromState(data);
    } catch (error) {
      console.warn('Status load failed:', error.message);
    }
  }

  async function fetchSession() {
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    Object.assign(permissions, data.permissions || {});
    document.querySelectorAll('.add-status-btn').forEach((button) => {
      button.classList.toggle('hidden', !permissions.manage_options);
    });
    if (customRowsContainer) customRowsContainer.classList.toggle('hidden', !permissions.manage_structure);
    if (addRowBtn) addRowBtn.classList.toggle('hidden', !permissions.manage_structure);
    if (editLabelsBtn) editLabelsBtn.classList.toggle('hidden', !permissions.edit_field_names);
    if (fieldMap.unit_number) fieldMap.unit_number.readOnly = !permissions.edit_unit_number;
    if (fieldMap.document_number) fieldMap.document_number.readOnly = !permissions.edit_unit_info;
    if (permissions.manage_accounts) {
      accountSettingsPanel.classList.remove('hidden');
    }
  }

  if (editLabelsBtn) {
    editLabelsBtn.addEventListener('click', () => {
      if (!permissions.edit_field_names) return;
      syncSelectableFieldLabels();
      fieldNamesEditMode = !fieldNamesEditMode;
      editLabelsBtn.textContent = fieldNamesEditMode ? 'Done editing field names' : 'Edit field names';
      editLabelsBtn.setAttribute('aria-pressed', String(fieldNamesEditMode));
      renderAllSelectableFields();
      renderStandardFieldEditors(fieldNamesEditMode);
    });
  }

  function setPasswordFeedback(message, type) {
    if (!passwordFeedback) return;
    passwordFeedback.textContent = message;
    passwordFeedback.className = `password-feedback ${type}`;
  }

  function setUsernameFeedback(message, type) {
    if (!usernameFeedback) return;
    usernameFeedback.textContent = message;
    usernameFeedback.className = `password-feedback ${type}`;
  }

  function closeUsernameModal() {
    if (usernameModal) usernameModal.classList.add('hidden');
    if (usernameFields) usernameFields.innerHTML = '';
    if (usernameFeedback) usernameFeedback.className = 'password-feedback hidden';
  }

  function renderUsernameFields() {
    const selected = document.querySelector('input[name="usernameAccount"]:checked')?.value || '1';
    const current = usernameMap[selected] || '';
    usernameFields.innerHTML = `<label class="username-field-label">Current username<input class="current-username-input" type="text" value="${current.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" readonly></label><label class="username-field-label">New username<input id="newUsernameInput" class="new-username-input" type="text" placeholder="Type new username" autocomplete="off"></label>`;
    usernameFields.querySelector('#newUsernameInput')?.focus();
  }

  async function openUsernameModal() {
    if (!permissions.manage_accounts) return;
    const response = await fetch('/api/accounts', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setUsernameFeedback(result.message || 'Unable to load usernames.', 'error');
      return;
    }
    usernameMap = result.usernames || {};
    renderUsernameFields();
    usernameModal.classList.remove('hidden');
  }

  if (changeUsernamesBtn) changeUsernamesBtn.addEventListener('click', openUsernameModal);
  if (closeUsernameModalBtn) closeUsernameModalBtn.addEventListener('click', closeUsernameModal);
  if (cancelUsernameBtn) cancelUsernameBtn.addEventListener('click', closeUsernameModal);
  document.querySelectorAll('input[name="usernameAccount"]').forEach((radio) => {
    radio.addEventListener('change', renderUsernameFields);
  });

  if (submitUsernameBtn) {
    submitUsernameBtn.addEventListener('click', async () => {
      const selectedAccount = document.querySelector('input[name="usernameAccount"]:checked');
      const newUsername = document.getElementById('newUsernameInput')?.value.trim() || '';
      const currentUsername = selectedAccount ? usernameMap[selectedAccount.value] : '';
      if (!newUsername) {
        setUsernameFeedback('New username is required.', 'error');
        return;
      }
      const otherUsernames = Object.entries(usernameMap)
        .filter(([level]) => level !== selectedAccount.value)
        .map(([, username]) => username);
      if (otherUsernames.includes(newUsername)) {
        setUsernameFeedback('Username is already in use.', 'error');
        return;
      }
      submitUsernameBtn.disabled = true;
      try {
        const response = await fetch('/api/change-usernames', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_level: Number(selectedAccount.value), new_username: newUsername })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          setUsernameFeedback(result.message || 'Unable to update usernames.', 'error');
          return;
        }
        usernameMap[selectedAccount.value] = newUsername;
        setUsernameFeedback('Username changed successfully.', 'success');
        setTimeout(closeUsernameModal, 900);
      } catch (error) {
        setUsernameFeedback('Could not update usernames.', 'error');
      } finally {
        submitUsernameBtn.disabled = false;
      }
    });
  }

  function clearPasswordForm() {
    ['newPasswordInput', 'confirmPasswordInput'].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.value = '';
        input.type = 'password';
      }
    });
    document.querySelectorAll('.password-visibility-btn').forEach((button) => {
      button.setAttribute('aria-label', `Show password`);
    });
    if (passwordFeedback) passwordFeedback.className = 'password-feedback hidden';
  }

  function closePasswordModal() {
    if (passwordModal) passwordModal.classList.add('hidden');
    clearPasswordForm();
  }

  if (changePasswordsBtn) {
    changePasswordsBtn.addEventListener('click', () => {
      if (!permissions.manage_accounts) return;
      clearPasswordForm();
      passwordModal.classList.remove('hidden');
      document.getElementById('newPasswordInput')?.focus();
    });
  }

  if (closePasswordModalBtn) closePasswordModalBtn.addEventListener('click', closePasswordModal);
  if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closePasswordModal);

  document.querySelectorAll('.password-visibility-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.passwordTarget);
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.setAttribute('aria-label', `${showing ? 'Show' : 'Hide'} password`);
    });
  });

  if (submitPasswordBtn) {
    submitPasswordBtn.addEventListener('click', async () => {
      const newPassword = document.getElementById('newPasswordInput').value;
      const confirmPassword = document.getElementById('confirmPasswordInput').value;
      if (!newPassword || !confirmPassword) {
        setPasswordFeedback('All password fields are required.', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordFeedback('New passwords do not match.', 'error');
        return;
      }
      submitPasswordBtn.disabled = true;
      try {
        const selectedAccount = document.querySelector('input[name="passwordAccount"]:checked');
        const response = await fetch('/api/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_level: selectedAccount ? Number(selectedAccount.value) : 0,
            new_password: newPassword,
            confirm_password: confirmPassword
          })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          setPasswordFeedback(result.message || 'Unable to change password.', 'error');
          return;
        }
        setPasswordFeedback('Password changed successfully.', 'success');
        setTimeout(closePasswordModal, 900);
      } catch (error) {
        setPasswordFeedback('Could not change password.', 'error');
      } finally {
        submitPasswordBtn.disabled = false;
      }
    });
  }

  if (addRowBtn && customRowsContainer) {
    addRowBtn.addEventListener('click', () => {
      customRowsContainer.querySelectorAll('.new-row-editor:not(.confirmed)').forEach((row) => row.remove());
      const newRow = createCustomRow();
      newRow.classList.add('new-row-editor');
      customRowsContainer.appendChild(newRow);
      newRow.querySelector('.custom-label')?.focus();
    });
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideFeedback();

      const activePreviousKey = getActiveSubKey('previous_name');
      const activeCurrentKey = getActiveSubKey('current_name');
      const activeBatchKey = getActiveSubKey('batch');
      syncSelectableFieldLabels();

      const payload = {
        area: fieldMap.area ? fieldMap.area.value.trim() : '',
        unit_number: fieldMap.unit_number ? fieldMap.unit_number.value.trim() : '',
        document_number: fieldMap.document_number ? fieldMap.document_number.value.trim() : '',
        equipment_codes: fieldMap.equipment_codes ? fieldMap.equipment_codes.value.trim() : '',
        status: valuesStore.status || '',
        status_options: optionsStore.status,
        product_name_options: optionsStore.product_name,
        material_name_options: optionsStore.material_name,
        previous_product_name_options: optionsStore.previous_product_name,
        previous_material_name_options: optionsStore.previous_material_name,
        batch_number_options: optionsStore.batch_number,
        sap_batch_number_options: optionsStore.sap_batch_number,
        previous_product_name: activePreviousKey === 'previous_product_name' ? (valuesStore.previous_product_name || '') : '',
        previous_material_name: activePreviousKey === 'previous_material_name' ? (valuesStore.previous_material_name || '') : '',
        previous_name_type: activePreviousKey,
        product_name: activeCurrentKey === 'product_name' ? (valuesStore.product_name || '') : '',
        material_name: activeCurrentKey === 'material_name' ? (valuesStore.material_name || '') : '',
        current_name_type: activeCurrentKey,
        batch_number: activeBatchKey === 'batch_number' ? (valuesStore.batch_number || '') : '',
        sap_batch_number: activeBatchKey === 'sap_batch_number' ? (valuesStore.sap_batch_number || '') : '',
        batch_type: activeBatchKey,
        cleaning_valid_up_to: fieldMap.cleaning_valid_up_to ? fieldMap.cleaning_valid_up_to.value : '',
        clean_before_datetime: fieldMap.clean_before_datetime ? fieldMap.clean_before_datetime.value : '',
        updated_by: fieldMap.updated_by ? fieldMap.updated_by.value.trim() : '',
        updated_on: fieldMap.updated_on ? fieldMap.updated_on.value : '',
        custom_rows: getCustomRows(),
        in_charge: fieldMap.updated_by ? fieldMap.updated_by.value.trim() : '',
        working: 0,
        production_kits: 0,
        batch_number_used: valuesStore[activeBatchKey] || '',
        selectable_fields: selectableFields,
        selectable_field_values: Object.fromEntries(Object.keys(valuesStore).map((key) => [key, valuesStore[key]])),
        selectable_field_options: Object.fromEntries(Object.keys(optionsStore).map((key) => [key, optionsStore[key]])),
        field_labels: Object.fromEntries(Array.from(document.querySelectorAll('[data-label-key]'))
          .filter((label) => !fieldGroupConfig[label.dataset.labelKey])
          .map((label) => {
            const editor = label.querySelector('.field-label-editor');
            const value = editor ? editor.value : label.textContent;
            return [label.dataset.labelKey, value.replace(/\s*:\s*$/, '').trim()];
          }))
      };

      if (!payload.updated_by) {
        showFeedback('error', 'Status updated by is required.');
        if (fieldMap.updated_by) fieldMap.updated_by.focus();
        return;
      }

      if (!payload.batch_number && !payload.sap_batch_number) {
        showFeedback('error', 'Batch No. or SAP Batch No. is required.');
        if (pickerElements.batch.pickerBtn) pickerElements.batch.pickerBtn.focus();
        return;
      }

      openSubmitConfirmModal(async () => {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Updating...';
        }

        try {
          const response = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          if (response.ok && result.success) {
            showFeedback('success', 'Production data saved successfully! Returning to display...');
            if (result.custom_rows) {
              populateFormFromState({ ...payload, custom_rows: result.custom_rows });
            }
            setTimeout(() => {
              window.location.href = '/';
            }, 800);
          } else {
            showFeedback('error', result.message || 'Unable to save data.');
          }
        } catch (error) {
          showFeedback('error', 'Could not reach MYIR server.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
          }
        }
      });
    });
  }

  fetchSession().then(fetchStatus).catch(() => {
    window.location.href = '/login';
  });
});
