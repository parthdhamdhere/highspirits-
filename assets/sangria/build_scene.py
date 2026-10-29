"""Reproducible original Cycles scene. Run with Blender --background --python.
Liquid is procedurally choreographed, not a baked Navier–Stokes simulation.
"""
import bpy, math, os, random, sys, shutil
from mathutils import Vector
from pathlib import Path
random.seed(14)
ROOT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
s=bpy.context.scene
s.render.engine='CYCLES'; s.cycles.samples=96; s.cycles.adaptive_threshold=.05; s.cycles.adaptive_min_samples=8; s.cycles.denoising_use_gpu=True; s.cycles.use_denoising=True

try:
 prefs=bpy.context.preferences.addons['cycles'].preferences
 prefs.compute_device_type='METAL'; prefs.get_devices()
 for device in prefs.devices: device.use=device.type=='METAL'
 if any(d.type=='METAL' for d in prefs.devices): s.cycles.device='GPU'
except Exception: pass
s.cycles.max_bounces=16; s.cycles.transmission_bounces=12
s.render.resolution_x=1920; s.render.resolution_y=1080; s.render.resolution_percentage=100
s.render.fps=24; s.frame_end=240
s.world.use_nodes=True
s.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.04,.003,.009,1)
s.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.12
s.view_settings.view_transform='AgX'
def mat(name,color,rough=.2,trans=0,ior=1.45):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Transmission Weight'].default_value=trans; p.inputs['IOR'].default_value=ior
 return m
glass=mat('Optical crystal • IOR 1.52',(.98,.99,1),.025,1,1.52)
wine=mat('Ruby sangria',(.52,.025,.045),.065,1,1.333)
vol=wine.node_tree.nodes.new('ShaderNodeVolumeAbsorption'); vol.inputs['Color'].default_value=(.85,.008,.02,1); vol.inputs['Density'].default_value=1.8
wine.node_tree.links.new(vol.outputs[0],wine.node_tree.nodes.get('Material Output').inputs['Volume'])
ice=mat('Clear ice',(.97,.99,1),.045,1,1.31)
rind=mat('Orange zest',(.8,.18,.012),.38); pith=mat('Orange pith',(.92,.69,.36),.48); flesh=mat('Juicy citrus',(.92,.28,.025),.29,.18)
flesh.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.13
green=mat('Rosemary needles',(.075,.14,.048),.38); wood=mat('Rosemary stem',(.18,.14,.055),.5)
for m,scale,strength in [(rind,95,.14),(flesh,65,.09),(ice,8,.04)]:
 n=m.node_tree.nodes; noise=n.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=scale
 bump=n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=strength; bump.inputs['Distance'].default_value=.018
 m.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']); m.node_tree.links.new(bump.outputs[0],n.get('Principled BSDF').inputs['Normal'])
def finish(o,m):
 o.data.materials.append(m)
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o
def lathe(name,profile,m,N=160):
 verts=[(r*math.cos(i*2*math.pi/N),r*math.sin(i*2*math.pi/N),z) for r,z in profile for i in range(N)]
 faces=[]
 for j in range(len(profile)-1):
  for i in range(N):
   a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return finish(o,m)
# Continuous closed wall profile: base, stem, bowl, rolled lip and inner surface.
lathe('Handblown martini glass',[(0,.04),(.55,.04),(.69,.06),(.72,.09),(.71,.12),(.58,.14),(.13,.15),(.065,.22),(.047,.35),(.043,1.58),(.075,1.72),(.12,1.79),(.24,1.91),(.5,2.17),(.8,2.47),(1.08,2.75),(1.095,2.77),(1.08,2.785),(1.065,2.765),(.78,2.48),(.48,2.18),(.22,1.92),(.085,1.80),(0,1.79)],glass)
liquid=lathe('Sangria body',[(0,0),(.01,0),(1,1)]+[(1-j/20,1) for j in range(1,21)],wine)
liquid.location.z=1.82
def cylinder(name,r,depth,loc,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;return finish(o,m)
def tube(name,points,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=4
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,m);return o
stream=tube('Continuous gravity stream',[(.38,.05,3.05),(.31,.05,2.95),(.2,.05,2.8),(.12,.05,2.1)],.035,wine)
carafe=lathe('Glass carafe',[(0,0),(.4,0),(.45,.08),(.46,.65),(.4,.9),(.19,1.15),(.15,1.4),(.17,1.44),(.145,1.45),(.125,1.4),(.16,1.14),(.37,.9),(.43,.64),(.42,.08),(0,.04)],glass)
# Orange wheel with individual juice segments and peel thickness.
bpy.ops.object.empty_add();orange=bpy.context.object;orange.name='Orange wheel assembly'
for name,r,d,m in [('Peel',.37,.085,rind),('Pith',.342,.089,pith)]:
 o=cylinder(name,r,d,(0,0,0),m);o.parent=orange
for k in range(10):
 a0=k*math.tau/10+.035;a1=(k+1)*math.tau/10-.035
 points=[(.035*math.cos((a0+a1)/2),.035*math.sin((a0+a1)/2))]+[(.315*math.cos(a0+(a1-a0)*j/12),.315*math.sin(a0+(a1-a0)*j/12)) for j in range(13)]
 vv=[(x,y,z) for z in [-.047,.047] for x,y in points];n=len(points)
 ff=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 me=bpy.data.meshes.new('Citrus segment');me.from_pydata(vv,[],ff);me.update();o=bpy.data.objects.new('Juice vesicles',me);bpy.context.collection.objects.link(o);finish(o,flesh);o.parent=orange
for k in range(600):
 a=random.uniform(0,math.tau);r=math.sqrt(random.uniform(.006,.092))
 # Leave the segment membranes visible.
 if (a % (math.tau/10)) < .045: continue
 bpy.ops.mesh.primitive_uv_sphere_add(segments=6,ring_count=4,radius=1,location=(r*math.cos(a),r*math.sin(a),.049))
 o=bpy.context.object;o.name='Citrus juice cell';o.scale=(random.uniform(.012,.023),random.uniform(.002,.004),.001);o.rotation_euler.z=a
 finish(o,flesh);o.parent=orange
orange.rotation_euler=(math.radians(77),.2,-.3)
orange.scale=(.85,.85,.85)
bpy.ops.object.empty_add();herb=bpy.context.object;herb.name='Rosemary sprig'
o=tube('Woody stem',[(0,0,0),(.06,0,.45),(.09,0,.9)],.009,wood);o.parent=herb
for j in range(22):
 z=.08+j*.035+random.uniform(-.008,.008)
 for side in [-1,1]:
  o=tube('Rosemary needle',[(z*.1,0,z),(z*.1+side*random.uniform(.045,.07),-.025,z+.06),(z*.1+side*random.uniform(.07,.11),random.uniform(-.03,.03),z+.1)],.004,green);o.parent=herb
cubes=[]
for x,y,z in [(-.32,.1,.02),(.25,.28,0),(.15,-.32,.025)]:
 bpy.ops.mesh.primitive_cube_add(size=.27,location=(x*.85,y*.85,2.51+z));o=bpy.context.object;o.name='Rounded clear ice';o.rotation_euler=(.2,.3,.4+x);finish(o,ice)
 bevel=o.modifiers.new('Soft melting edges','BEVEL');bevel.width=.045;bevel.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');cubes.append(o)
floor=mat('Polished black stone',(.009,.004,.006),.18)
bpy.ops.mesh.primitive_plane_add(size=200);finish(bpy.context.object,floor)
def light(name,loc,power,color,size,target,shape='DISK',size_y=None):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape=shape;o.data.size=size
 if size_y:o.data.size_y=size_y
 o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
light('Warm amber strip',(-3,1,3.5),260,(1,.78,.55),.45,(0,0,2),'RECTANGLE',4)
light('Cool softbox',(3,-2,4),280,(.88,.94,1),.65,(0,0,2),'RECTANGLE',4)
light('Glass edge',(0,3,3.8),320,(1,.88,.74),.8,(0,0,2),'RECTANGLE',3)
light('Front fill',(-1,-4,5),90,(1,.9,.8),3,(0,0,1.7))
light('Burgundy backdrop',(-1,3,5),120,(.5,.015,.035),4,(0,4,0))
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.lens=45
cam.data.dof.use_dof=True;cam.data.dof.aperture_fstop=9
bpy.ops.object.empty_add(location=(0,0,2.1));focus=bpy.context.object;cam.data.dof.focus_object=focus

def smooth(a,b,t):
 t=max(0,min(1,(t-a)/(b-a)));return t*t*(3-2*t)
def pose(frame):
 t=min(.81,(frame-1)/239)
 # Full silhouette at both ends; a gentle arc leaves space for the hero copy.
 pull=smooth(.04,.78,t)
 cam.location=(.3+2.9*pull,-8.0-.6*pull,3.5+.6*pull)
 target=Vector((-1.25*pull,0,1.65+.1*pull))
 cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 focus.location=(0,0,2.1)
 fill=smooth(.14,.64,t);h=.04+.7*fill;radius=h+.12
 liquid.scale=(radius,radius,h)
 for i in range(160):
  a=i*math.tau/160;liquid.data.vertices[160+i].co=(.105/radius*math.cos(a),.105/radius*math.sin(a),0)
 liquid.data.update()
 agitation=smooth(.14,.2,t)*(1-smooth(.63,.82,t))
 # The meniscus belongs to the closed liquid volume, avoiding overlapping refractive faces.
 for ring in range(2,23):
  r=1-(ring-2)/20
  for i in range(160):
   a=i*math.tau/160
   impact=math.hypot(r*math.cos(a)+.08,r*math.sin(a)-.05)
   ripple=.004*math.sin(impact*32-t*125)*math.exp(-impact*2.8)*agitation
   liquid.data.vertices[ring*160+i].co.z=1+ripple/h
 liquid.data.update()
 # The stream starts at the actual carafe lip, including its tilt and exit.
 enter=smooth(.02,.14,t);leave=smooth(.65,.76,t)
 tilt=math.radians(-116)*smooth(.07,.14,t)*(1-smooth(.64,.7,t))
 carafe.rotation_euler=(0,tilt,0)
 lip=Vector((.4+5*(1-enter)+5*leave,.05,3.55+.7*leave))
 carafe.location=lip-carafe.rotation_euler.to_matrix()@Vector((0,0,1.44))
 carafe.hide_render=t>.78
 pouring=smooth(.14,.17,t)*(1-smooth(.62,.65,t))
 stream.hide_render=pouring<.001
 stream.data.bevel_depth=.031*max(.01,pouring)
 points=[lip,lip+Vector((-.12,0,-.12)),Vector((-.07,.05,3.04)),Vector((-.08,.05,1.82+h))]
 for i,(point,co) in enumerate(zip(stream.data.splines[0].bezier_points,points)):
  point.co=co
  point.radius=1-.13*i+.035*math.sin(t*190+i*2)
 # Garnishes travel into frame and decelerate onto the rim, rather than appearing there.
 g=smooth(.65,.76,t)
 orange.location=(-.83,-.25,2.85+2.7*(1-g))
 orange.rotation_euler=(math.radians(77),.2+.3*(1-g),-.3+.5*(1-g))
 orange.hide_render=t<.65
 q=smooth(.7,.8,t)
 herb.location=(.58,.1,2.52+2.7*(1-q))
 herb.rotation_euler=(.15,.42+.25*(1-q),-.15)
 herb.hide_render=t<.7
 # Ice is already in the bowl; it lifts and gently settles as the liquid rises.
 for i,o in enumerate(cubes):
  o.hide_render=False
  o.location.z=2.30+i*.045+.14*fill+.012*math.sin(t*34+i)*agitation
  o.rotation_euler.z=.4+o.location.x+.08*math.sin(t*20+i)*agitation
 liquid.hide_render=t<.14
 bpy.data.objects['Warm amber strip'].location.x=-3+.12*math.sin(t*math.pi)

# Save source and render requested frame or full sequence.
pose(240);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'sangria.blend'))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
frames=[240]
if args and args[0]=='0':frames=list(range(1,241))
elif args and ':' in args[0]:
 start,end=(int(value) for value in args[0].split(':',1))
 frames=list(range(start,end+1))
elif args:
 frames=[int(args[0])]
(ROOT/'renders-hd').mkdir(exist_ok=True)
for f in frames:
 # The final hold is identical; reuse its pixels instead of introducing denoising shimmer.
 if f>195 and 195 in frames:
  shutil.copyfile(ROOT/'renders-hd'/'0195.png',ROOT/'renders-hd'/f'{f:04d}.png')
  continue
 pose(f);s.render.filepath=str(ROOT/'renders-hd'/f'{f:04d}.png');bpy.ops.render.render(write_still=True)
