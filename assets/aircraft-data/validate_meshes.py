import json, struct
from pathlib import Path
root = Path(__file__).resolve().parent
catalog = json.loads((root / 'catalog.json').read_text())
for item in catalog['aircraft']:
 p = root / item['mesh_path']
 b = p.read_bytes()
 magic, version, length = struct.unpack_from('<4sII', b)
 assert magic == b'glTF' and version == 2 and length == len(b), p
 jl, tag = struct.unpack_from('<I4s', b, 12)
 assert tag == b'JSON', p
 g = json.loads(b[20:20+jl])
 offset = 20 + jl
 bl, bt = struct.unpack_from('<I4s', b, offset)
 assert bt == b'BIN\0', p
 raw = b[offset+8:offset+8+bl]
 for a in g['accessors']:
  view = g['bufferViews'][a['bufferView']]
  components = 3 if a['type'] == 'VEC3' else 1
  assert a['count'] * 4 * components <= view['byteLength']
  assert view['byteOffset'] + view['byteLength'] <= len(raw)
 for mesh in g['meshes']:
  for prim in mesh['primitives']:
   a = g['accessors'][prim['indices']]
   view = g['bufferViews'][a['bufferView']]
   indices = struct.unpack_from('<' + str(a['count']) + 'I', raw, view['byteOffset'])
   assert max(indices) < g['accessors'][prim['attributes']['POSITION']]['count']
 for node in g['nodes']:
  if 'mesh' in node: assert node['mesh'] < len(g['meshes'])
 assert g['asset']['extras']['aircraft_id'] == item['id']
print('PASS:', len(catalog['aircraft']), 'GLB containers, geometry bounds, and aircraft identities')
