"""hehehe.cmo3 (Live2D Cubism 編集ファイル) から、プレビュー用のデータを取り出す。
使い方: python -I tools/cmo3/extract.py <cmo3のパス> <出力フォルダ>
出力: model.json と tex/*.png (CAFF は先頭 0xC7 の XOR、main.xml は raw deflate)"""
import sys, os, json, zlib, xml.etree.ElementTree as ET

src, out = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
key = int.from_bytes(b[14:18], 'big')
KB = key & 0xFF
def i32(o): return int.from_bytes(b[o:o+4], 'big') ^ key
n = i32(54); o = 58
def s():
    global o
    l = b[o] ^ KB; o += 1
    r = bytes(x ^ KB for x in b[o:o+l]); o += l
    return r.decode('utf-8', 'replace')
files = {}
for _ in range(n):
    name = s(); s(); o += 4
    st = i32(o); o += 4; sz = i32(o); o += 4
    o += 2 + 8
    files[name] = bytes(x ^ KB for x in b[st:st+sz])
z = files['main.xml']
nl = int.from_bytes(z[26:28], 'little'); el = int.from_bytes(z[28:30], 'little')
root = ET.fromstring(zlib.decompressobj(-15).decompress(z[30+nl+el:]))

ids = {e.get('xs.id'): e for e in root.iter() if 'xs.id' in e.attrib}
def N(e, name):
    for c in e:
        if c.get('xs.n') == name: return c
def val(e, name, cast=str):
    c = N(e, name); return cast(c.text) if c is not None and c.text else None
def arr(e, name, cast=float):
    c = N(e, name); return [cast(x) for x in c.text.split()] if c is not None and c.text else []
def ref(e):  # xs.ref を実体に
    r = e.get('xs.ref'); return ids[r] if r else e
def gid(e): return e.get('xs.ref') or e.get('xs.id')

# パラメーター
params = []; pidx = {}
for p in [p for p in root.iter('CParameterSource') if 'xs.ref' not in p.attrib]:
    pidx[gid(N(p, 'guid'))] = len(params)
    params.append(dict(name=val(p, 'name'), min=val(p, 'minValue', float), max=val(p, 'maxValue', float), default=val(p, 'defaultValue', float)))

def grid(g):
    g = ref(g)
    binds = []
    bidx = {}
    for kb in N(g, 'keyformBindings'):
        kb = ref(kb); bidx[kb.get('xs.id')] = len(binds)
        binds.append(dict(param=pidx[gid(N(kb, 'parameterGuid'))], keys=[float(f.text) for f in N(kb, 'keys')]))
    ents = []
    for k in N(g, 'keyformsOnGrid'):
        idx = [0]*len(binds)
        for kp in N(N(k, 'accessKey'), '_keyOnParameterList'):
            idx[bidx[N(kp, 'binding').get('xs.ref')]] = int(val(kp, 'keyIndex'))
        ents.append(dict(idx=idx, form=gid(N(k, 'keyformGuid'))))
    return binds, ents

images = {}
for mi in root.iter('CModelImage'):
    g = N(mi, 'guid'); res = ref(N(mi, '_filteredImage'))
    f = N(res, 'imageFileBuf').get('path'); t = N(mi, '_materialLocalToCanvasTransform')
    images[gid(g)] = dict(file=f, w=int(res.get('width')), h=int(res.get('height')), ox=float(t.get('m02')), oy=float(t.get('m12')), name=val(mi, 'name'))

def form_guid(f):
    acf = N(N(f, 'super'), 'super') if N(f, 'super') is not None and N(N(f, 'super'), 'super') is not None else N(f, 'super')
    return gid(N(acf, 'guid'))
def base(e):  # ACDrawableForm / ACDeformerForm
    return N(e, 'super')

deformers = []; didx = {}
rot = [d for d in root.iter('CRotationDeformerSource') if 'xs.ref' not in d.attrib]
for d in rot:
    sup = N(d, 'super'); didx[gid(N(sup, 'guid'))] = len(deformers); deformers.append(None)
for d in rot:
    sup = N(d, 'super'); i = didx[gid(N(sup, 'guid'))]
    binds, ents = grid(N(N(sup, 'super'), 'keyformGridSource'))
    forms = {}
    for f in N(d, 'keyforms'):
        acf = N(N(base(f), 'super'), 'guid')
        forms[gid(acf)] = dict(angle=float(f.get('angle')), ox=float(f.get('originX')), oy=float(f.get('originY')), scale=float(f.get('scale')),
                               rx=f.get('isReflectX') == 'true', ry=f.get('isReflectY') == 'true', opacity=val(base(f), 'opacity', float))
    par = gid(N(sup, 'targetDeformerGuid'))
    deformers[i] = dict(name=val(N(sup, 'super'), 'localName'), parent=didx.get(par, -1), binds=binds,
                        forms=[forms[e['form']] for e in ents], idx=[e['idx'] for e in ents])

meshes = []; guid2mesh = {}
arts = [m for m in root.iter('CArtMeshSource') if 'xs.ref' not in m.attrib]
for m in arts:
    sup = N(m, 'super'); guid2mesh[gid(N(sup, 'guid'))] = len(guid2mesh)
for m in arts:
    sup = N(m, 'super'); pc = N(sup, 'super')
    ext = N(pc, '_extensions')
    pts = None; ti = None
    for x in ext:
        if x.tag == 'CEditableMeshExtension': pts = arr(N(x, 'editableMesh'), 'point')
        if x.tag == 'CTextureInputExtension':
            ti = ref(x)
    tin = ref(N(ti, 'currentTextureInputData'))
    img = images[gid(N(tin, '_modelImageGuid'))]
    binds, ents = grid(N(pc, 'keyformGridSource'))
    forms = {}
    for f in N(m, 'keyforms'):
        df = base(f)
        forms[gid(N(N(df, 'super'), 'guid'))] = dict(order=val(df, 'drawOrder', int), opacity=val(df, 'opacity', float), pos=arr(f, 'positions'))
    clip = [guid2mesh[gid(c)] for c in N(sup, 'clipGuidList')]
    meshes.append(dict(name=val(pc, 'localName'), visible=val(pc, 'isVisible') == 'true', img=img['file'], iw=img['w'], ih=img['h'], ox=img['ox'], oy=img['oy'],
                       pts=pts, tri=arr(m, 'indices', int), parent=didx.get(gid(N(sup, 'targetDeformerGuid')), -1), clip=clip, invclip=val(sup, 'invertClippingMask') == 'true',
                       binds=binds, forms=[forms[e['form']] for e in ents], idx=[e['idx'] for e in ents]))

os.makedirs(out + '/tex', exist_ok=True)
for im in {m['img'] for m in meshes}:
    open(f'{out}/tex/{im}', 'wb').write(files[im])
json.dump(dict(params=params, deformers=deformers, meshes=meshes), open(out + '/model.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(params), len(deformers), len(meshes), 'clipped:', sum(1 for m in meshes if m['clip']), 'unique tex:', len({m['img'] for m in meshes}))
