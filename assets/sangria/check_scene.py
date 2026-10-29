"""Run with Blender --background --python assets/sangria/check_scene.py.
Verify framing and the pour connection without rendering the sequence.
"""
from pathlib import Path
from bpy_extras.object_utils import world_to_camera_view

source = Path(__file__).with_name('build_scene.py')
exec(compile(source.read_text().split('# Save source')[0], str(source), 'exec'))
glass_object = bpy.data.objects['Handblown martini glass']
for frame in range(1, 241):
    pose(frame)
    bpy.context.view_layer.update()
    projected = [world_to_camera_view(s, cam, glass_object.matrix_world @ v.co)
                 for v in glass_object.data.vertices]
    assert all(.02 < v.x < .98 and .015 < v.y < .98 for v in projected), f'Glass clipped at {frame}'
    if frame >= 195:
        assert min(v.x for v in projected) > .47, 'Final glass overlaps hero text column'
    if not stream.hide_render:
        lip = carafe.matrix_world @ Vector((0, 0, 1.44))
        start = stream.data.splines[0].bezier_points[0].co
        assert (lip - start).length < .0001, f'Detached pour at {frame}'
    for cube in cubes:
        for corner in cube.bound_box:
            point = cube.matrix_world @ Vector(corner)
            # The lower inner bowl is approximately a 45-degree cone.
            assert math.hypot(point.x, point.y) < point.z - 1.70, f'Ice penetrates bowl at {frame}'
print('PASS: all 240 poses keep the glass in frame, ice in the bowl, and stream attached to the lip.')
