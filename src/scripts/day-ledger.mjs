import { calculateLedger, parseTripInput } from '../lib/day-ledger.mjs';

const form = document.querySelector('[data-ledger-form]');
if (form) {
  const trips = form.querySelector('[name=trips]');
  const results = document.querySelector('[data-ledger-results]');
  const status = document.querySelector('[data-ledger-status]');
  const sample = {
    prDate: '2024-01-01', temporaryStart: '2022-01-01', canadaStart: '2022-01-01', birthDate: '1985-06-01', asOf: '2026-10-01', province: 'bc',
    trips: [{ departure: '2025-03-01', return: '2025-04-01', exception: false, note: '示例行程' }]
  };
  const read = () => ({
    prDate: form.prDate.value,
    temporaryStart: form.temporaryStart.value || undefined,
    canadaStart: form.canadaStart.value || form.temporaryStart.value || form.prDate.value,
    birthDate: form.birthDate.value || undefined,
    asOf: form.asOf.value,
    province: form.province.value,
    trips: parseTripInput(trips.value)
  });
  const write = (data) => {
    for (const name of ['prDate','temporaryStart','canadaStart','birthDate','asOf','province']) if (data[name] != null && form[name]) form[name].value = data[name];
    trips.value = JSON.stringify(data.trips || [], null, 2);
  };
  const render = (data) => {
    const r = calculateLedger(data);
    results.innerHTML = `<div class="metrics">
      <div class="metric"><span>PR 五年尺</span><strong>${r.pr.days}</strong><small>缺 ${r.pr.missing} 天；窗口从 ${r.pr.windowStart}</small></div>
      <div class="metric"><span>入籍尺</span><strong>${r.citizenship.total}</strong><small>PR 后 ${r.citizenship.prDays} ＋ PR 前折算 ${r.citizenship.prePrCredit}</small></div>
      <div class="metric"><span>本税年在加</span><strong>${r.tax.days}</strong><small>${r.tax.signal ? '越过 183 天信号' : '未越过 183 天信号'}，不能据此单独定居民身份</small></div>
      <div class="metric"><span>${r.health.province} 医保尺</span><strong>${r.health.days}</strong><small>${r.health.signal}</small></div>
      <div class="metric"><span>OAS 居住估算</span><strong>${r.oas.years}</strong><small>约为全额的 ${(r.oas.fraction * 100).toFixed(1)}%；协定与例外另核</small></div>
    </div><h3>未来五年关键日期</h3><ol class="timeline">${r.timeline.map((event) => `<li><strong>${event.date}</strong><br>${event.label}</li>`).join('') || '<li>当前输入下，未来五年没有算出新的门槛日。</li>'}</ol>`;
    status.textContent = '已在当前页面完成计算；没有上传任何记录。';
    return r;
  };
  form.addEventListener('submit', (event) => { event.preventDefault(); try { render(read()); } catch (error) { status.textContent = `请检查输入：${error.message}`; } });
  document.querySelector('[data-sample]')?.addEventListener('click', () => { write(sample); render(sample); });
  document.querySelector('[data-add-trip]')?.addEventListener('click', () => {
    try {
      const rows = parseTripInput(trips.value);
      if (!form.newDeparture.value) throw new Error('请先填离境日');
      rows.push({ departure: form.newDeparture.value, ...(form.newReturn.value ? { return: form.newReturn.value } : {}), exception: form.newException.checked });
      trips.value = JSON.stringify(rows, null, 2);
      form.newDeparture.value = ''; form.newReturn.value = ''; form.newException.checked = false;
      status.textContent = `已加入第 ${rows.length} 段行程；点击计算后才更新结果。`;
    } catch (error) { status.textContent = `无法加入：${error.message}`; }
  });
  document.querySelector('[data-export]')?.addEventListener('click', () => {
    try { const blob = new Blob([JSON.stringify(read(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'maple-status-records.json'; a.click(); URL.revokeObjectURL(a.href); } catch (error) { status.textContent = `无法导出：${error.message}`; }
  });
  document.querySelector('[data-import]')?.addEventListener('change', async (event) => { try { const data = JSON.parse(await event.target.files[0].text()); write(data); render(data); } catch (error) { status.textContent = `无法导入：${error.message}`; } });
}
