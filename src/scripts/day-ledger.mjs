import { calculateFamilyLedger, normalizeFamilyFile, serializeFamilyFile } from '../lib/family-ledger.mjs';
import { parseTripInput } from '../lib/day-ledger.mjs';
import { parseCbsaColumns } from '../lib/cbsa-import.mjs';

const form = document.querySelector('[data-family-form]');
if (form) {
  const editors = form.querySelector('[data-members]');
  const results = document.querySelector('[data-family-results]');
  const status = form.querySelector('[data-ledger-status]');
  const cbsaTarget = form.querySelector('[data-cbsa-target]');
  const cbsaColumns = form.querySelector('[data-cbsa-columns]');
  let members = [];
  const sample = {
    schemaVersion: 2, asOf: '2026-10-01', members: [
      { id: 'member-1', name: 'PR 配偶', citizenshipStatus: 'pr', spouseId: 'member-2', claimAccompanying: true, prDate: '2024-01-01', canadaStart: '2024-01-01', birthDate: '1985-06-01', province: 'bc', trips: [{ departure: '2025-03-01', return: '2025-04-01', exception: true, note: '陪同配偶' }] },
      { id: 'member-2', name: '公民配偶', citizenshipStatus: 'citizen', spouseId: 'member-1', province: 'bc', trips: [{ departure: '2025-02-20', return: '2025-04-10', note: '境外行程' }] }
    ]
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const nextId = () => `member-${Date.now()}-${members.length + 1}`;
  const blankMember = (index = members.length) => ({ id: nextId(), name: `成员 ${index + 1}`, citizenshipStatus: 'pr', province: 'bc', trips: [] });

  function syncFromEditors() {
    members = [...editors.querySelectorAll('[data-member]')].map((card) => ({
      id: card.dataset.member,
      name: card.querySelector('[name=name]').value.trim() || '未命名成员',
      citizenshipStatus: card.querySelector('[name=citizenshipStatus]').value,
      spouseId: card.querySelector('[name=spouseId]').value || undefined,
      claimAccompanying: card.querySelector('[name=claimAccompanying]').checked,
      prDate: card.querySelector('[name=prDate]').value || undefined,
      temporaryStart: card.querySelector('[name=temporaryStart]').value || undefined,
      canadaStart: card.querySelector('[name=canadaStart]').value || undefined,
      birthDate: card.querySelector('[name=birthDate]').value || undefined,
      province: card.querySelector('[name=province]').value,
      trips: parseTripInput(card.querySelector('[name=trips]').value)
    }));
    return members;
  }

  function renderEditors() {
    editors.innerHTML = members.map((member, index) => {
      const spouseOptions = members.filter((candidate) => candidate.id !== member.id).map((candidate) => `<option value="${escapeHtml(candidate.id)}" ${candidate.id === member.spouseId ? 'selected' : ''}>${escapeHtml(candidate.name)}</option>`).join('');
      return `<section class="panel fields" data-member="${escapeHtml(member.id)}"><div class="member-heading"><h2>成员 ${index + 1}</h2>${members.length > 1 ? '<button type="button" class="secondary" data-remove-member>移除</button>' : ''}</div>
        <div class="field"><label>姓名／称呼</label><input name="name" value="${escapeHtml(member.name)}" required /></div>
        <div class="field"><label>当前身份</label><select name="citizenshipStatus"><option value="pr" ${member.citizenshipStatus === 'pr' ? 'selected' : ''}>PR</option><option value="citizen" ${member.citizenshipStatus === 'citizen' ? 'selected' : ''}>加拿大公民</option><option value="other" ${member.citizenshipStatus === 'other' ? 'selected' : ''}>其他</option></select></div>
        <div class="field"><label>家庭内配偶</label><select name="spouseId"><option value="">未选择</option>${spouseOptions}</select></div>
        <label><input name="claimAccompanying" type="checkbox" ${member.claimAccompanying ? 'checked' : ''} /> 将本人行程中标为“例外”的时段，与家庭内公民配偶行程对照</label>
        <div class="field"><label>成为 PR 的日期（公民只作配偶参照时可空）</label><input name="prDate" type="date" value="${escapeHtml(member.prDate || '')}" /></div>
        <div class="field"><label>合资格临时身份开始日（可空）</label><input name="temporaryStart" type="date" value="${escapeHtml(member.temporaryStart || '')}" /></div>
        <div class="field"><label>开始在加拿大通常居住的日期</label><input name="canadaStart" type="date" value="${escapeHtml(member.canadaStart || '')}" /></div>
        <div class="field"><label>出生日期（OAS 十八岁后线索）</label><input name="birthDate" type="date" value="${escapeHtml(member.birthDate || '')}" /></div>
        <div class="field"><label>医保尺</label><select name="province"><option value="bc" ${member.province === 'bc' ? 'selected' : ''}>BC MSP</option><option value="on" ${member.province === 'on' ? 'selected' : ''}>Ontario OHIP</option></select></div>
        <div class="field"><label>行程粘贴区</label><textarea name="trips" spellcheck="false">${escapeHtml(JSON.stringify(member.trips || [], null, 2))}</textarea><small class="help">支持 JSON，或每行“离境日,返加日,例外”。只有勾选上方声明后，例外行程才会对照公民配偶的同期行程。</small></div></section>`;
    }).join('');
    editors.querySelectorAll('[data-remove-member]').forEach((button) => button.addEventListener('click', () => {
      const id = button.closest('[data-member]').dataset.member;
      syncFromEditors();
      members = members.filter((member) => member.id !== id).map((member) => member.spouseId === id ? { ...member, spouseId: undefined } : member);
      renderEditors();
    }));
    const previousTarget = cbsaTarget.value;
    cbsaTarget.innerHTML = members.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`).join('');
    if (members.some((member) => member.id === previousTarget)) cbsaTarget.value = previousTarget;
  }

  const read = () => ({ schemaVersion: 2, asOf: form.asOf.value, members: syncFromEditors() });
  const write = (data) => {
    const family = normalizeFamilyFile(data);
    form.asOf.value = family.asOf;
    members = family.members;
    renderEditors();
  };

  function metric(label, value, detail) { return `<div class="metric"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`; }
  function render(data) {
    const family = calculateFamilyLedger(data);
    results.innerHTML = family.results.map(({ member, calculation: r, accompanyingCitizen }) => {
      const exceptionRows = accompanyingCitizen.length ? `<h3>陪同公民配偶标注</h3><ul class="result-list">${accompanyingCitizen.map((item) => `<li><strong>${item.matched ? '已对上，仍未加回' : '未对上'}</strong><br>${escapeHtml(item.reason)}</li>`).join('')}</ul>` : '';
      if (!r) return `<article class="panel member-result"><h2>${escapeHtml(member.name)}</h2><p class="muted">此成员没有 PR 日期，当前只作家庭关系与公民陪同行程参照，不生成个人五尺结果。</p>${exceptionRows}</article>`;
      return `<article class="panel member-result"><h2>${escapeHtml(member.name)}</h2><div class="metrics">
        ${metric('PR 五年尺', r.pr.days, `缺 ${r.pr.missing} 天；窗口从 ${r.pr.windowStart}；本规则自 ${r.ruleVersions.pr} 起`)}
        ${metric('入籍尺', r.citizenship.total, `PR 后 ${r.citizenship.prDays} ＋ PR 前折算 ${r.citizenship.prePrCredit}；本规则自 ${r.ruleVersions.citizenship} 起`)}
        ${metric('本税年在加', r.tax.days, `${r.tax.signal ? '越过' : '未越过'} 183 天信号，不能单独定税务居民；本规则自 ${r.ruleVersions.tax} 起`)}
        ${metric(`${r.health.province} 医保尺`, r.health.days, `${r.health.signal}；本规则自 ${r.ruleVersions.health} 起`)}
        ${metric('OAS 居住天数线索', r.oas.days, `从 ${r.oas.periodStart} 记到 ${r.oas.periodEnd}；不换成小数年或资格比例；本规则自 ${r.ruleVersions.oas} 起`)}
      </div>${exceptionRows}<details><summary>OAS 通常居住事实与证据清单</summary><ul class="result-list">${r.oas.evidenceChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p class="help">这是整理清单，不是 Service Canada 承诺接受的封闭材料表；官方可在申请后要求其他文件。</p></details><h3>未来五年关键日期</h3><ol class="timeline">${r.timeline.map((event) => `<li><strong>${event.date}</strong><br>${escapeHtml(event.label)}</li>`).join('') || '<li>当前输入下，未来五年没有算出新的门槛日。</li>'}</ol></article>`;
    }).join('');
    status.textContent = `已在当前页面完成 ${family.members.length} 名成员的计算；没有上传任何记录。`;
    return family;
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); try { render(read()); } catch (error) { status.textContent = `请检查输入：${error.message}`; } });
  form.querySelector('[data-add-member]').addEventListener('click', () => { try { syncFromEditors(); members.push(blankMember()); renderEditors(); } catch (error) { status.textContent = `无法添加：${error.message}`; } });
  form.querySelector('[data-sample]').addEventListener('click', () => { write(sample); render(sample); });
  form.querySelector('[data-export]').addEventListener('click', () => {
    try { const blob = new Blob([JSON.stringify(serializeFamilyFile(read()), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = members.length > 1 ? 'maple-status-family.json' : 'maple-status-records.json'; a.click(); URL.revokeObjectURL(a.href); } catch (error) { status.textContent = `无法导出：${error.message}`; }
  });
  form.querySelector('[data-import]').addEventListener('change', async (event) => { try { const data = JSON.parse(await event.target.files[0].text()); write(data); render(data); } catch (error) { status.textContent = `无法导入：${error.message}`; } });
  form.querySelector('[data-cbsa-import]').addEventListener('click', () => {
    try {
      syncFromEditors();
      const parsed = parseCbsaColumns(cbsaColumns.value);
      const target = members.find((member) => member.id === cbsaTarget.value);
      if (!target) throw new Error('请先选择家庭成员');
      target.trips = parsed.trips;
      renderEditors();
      status.textContent = `已为 ${target.name} 解析 ${parsed.events.length} 条入出境事件，生成 ${parsed.trips.length} 段行程${parsed.warnings.length ? `；还有 ${parsed.warnings.length} 条未配对入境提示` : ''}。`;
    } catch (error) { status.textContent = `CBSA 列未导入：${error.message}；原行程保持不变。`; }
  });

  members = [blankMember(0)];
  renderEditors();
}
