import json,struct,math
from pathlib import Path
base=Path(__file__).resolve().parent
root=base/'airline-meshes';reports=[]
for p in sorted(root.glob('*.glb')):
 b=p.read_bytes();jl=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+jl]);meta=g['asset']['extras'];width=meta['modeled_dimensions_m']['width'];height=meta['modeled_dimensions_m']['height'];length=meta['modeled_dimensions_m']['length'];cy=height*.36;ry=height*.64
 occupied=[];wall_violations=[]
 def bounds(n):
  a=g['accessors'][g['meshes'][n['mesh']]['primitives'][0]['attributes']['POSITION']];t=n.get('translation',[0,0,0]);return ([a['min'][i]+t[i] for i in range(3)],[a['max'][i]+t[i] for i in range(3)])
 for seat in meta['seat_nodes']:
  bb=[bounds(n) for n in g['nodes'][seat['component_node_start']:seat['component_node_end']] ]
  low=[min(x[0][i] for x in bb) for i in range(3)];high=[max(x[1][i] for x in bb) for i in range(3)]
  occupied.append((seat['id'],low,high))
  # Test each component, rather than projecting an entire seat's widest part down to floor level.
  for lo,hi in bb:
   for y in [lo[1],hi[1]]:
    if y<=cy: limit=width*.46-.035
    else: limit=width/2*math.sqrt(max(0,1-((y-cy)/ry)**2))-.015
    if max(abs(lo[0]),abs(hi[0]))>limit:wall_violations.append(seat['id'])
  assert low[1]>=-.001 and low[2]>-length/2 and high[2]<length/2,seat['id']
 collisions=[]
 for i,(aid,al,ah) in enumerate(occupied):
  for bid,bl,bh in occupied[i+1:]:
   if all(min(ah[k],bh[k])-max(al[k],bl[k])>.001 for k in range(3)):collisions.append([aid,bid])
 reports.append({'model':p.name,'seat_count':len(occupied),'seat_envelope_overlaps':collisions,'curved_sidewall_envelope_violations':sorted(set(wall_violations)),'test_method':'Aggregate seat AABBs checked against other seats; component AABBs checked against curved upper sidewalls and lower lining clearance. Does not verify OEM fit, egress compliance or unmodeled objects.'})
 print(p.name,'seat collisions',len(collisions),'wall conflicts',len(set(wall_violations)))
 if collisions:print(' examples',collisions[:10])
 if wall_violations:print(' wall examples',sorted(set(wall_violations))[:10])
(base/'airline-clearance-report.json').write_text(json.dumps({'reports':reports},indent=2))

assert reports and all(not r["seat_envelope_overlaps"] and not r["curved_sidewall_envelope_violations"] for r in reports), "Airline seat clearance check failed"
