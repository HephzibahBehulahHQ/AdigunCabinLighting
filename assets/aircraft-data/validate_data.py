import json,math
from pathlib import Path
root=Path(__file__).resolve().parent
catalog=json.loads((root/'catalog.json').read_text())
ids=set();count=0
for item in catalog['aircraft']:
 record=json.loads((root/item['path']).read_text());assert record['id']==item['id'] and record['id'] not in ids
 ids.add(record['id']);assert record['source']['url'].startswith('https://')
 for section in ['exterior','interior']:
  for key,value in record[section].items():
   if key.endswith('_m') and value is not None:assert isinstance(value,(int,float)) and math.isfinite(value) and value>0,(record['id'],key)
 seen=set()
 for s in json.loads((root/item['scenario_path']).read_text())['scenarios']:
  assert s['aircraft_id']==record['id'] and s['id'] not in seen;seen.add(s['id'])
  assert s['mode']=='SIMULATION' and 0<=s['master_intensity']<=1
  assert s['duration_seconds']>0
  assert set(s['zones'])=={'ceiling_cove','left_sidewall','right_sidewall','footwell'}
  for z in s['zones'].values():
   frames=z['keyframes'];ts=[k['time_seconds'] for k in frames]
   assert ts==sorted(set(ts)) and ts[0]==0 and ts[-1]==s['duration_seconds']
   for k in frames:assert len(k['rgbw'])==4 and all(0<=x<=1 for x in k['rgbw'])
  count+=1
 assert len(seen)==6
profiles=json.loads((root/'airline-configurations.json').read_text())['configurations']
assert len({p['id'] for p in profiles})==len(profiles)
for p in profiles:
 assert p['aircraft_id'] in ids and p['total_seats']>0
 if p['class_seat_counts'] is not None:assert sum(p['class_seat_counts'].values())==p['total_seats']
agg=json.loads((root/'aircraft-dimensions.json').read_text())
assert {r['id'] for r in agg['aircraft']}==ids
assert len(ids)==catalog['aircraft_count'] and count==catalog['scenario_count'] and len(profiles)==catalog['airline_configuration_count']
print(f'PASS: {len(ids)} aircraft, {len(profiles)} airline capacity records, {count} scenarios')
