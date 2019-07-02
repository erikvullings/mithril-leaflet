import m from 'mithril';
import { Button, CodeBlock } from 'mithril-materialized';
import { LeafletMap } from 'mithril-leaflet';
import { Feature, Geometry } from 'geojson';
import { LatLngExpression, FeatureGroup, LeafletEvent, geoJSON } from 'leaflet';

export const HomePage = () => {
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.11501312255859375, 51.50756719022885],
              [-0.11183738708496094, 51.504148054725356],
              [-0.10746002197265625, 51.50473573689897],
              [-0.10282516479492186, 51.504575460694184],
              [-0.1043701171875, 51.50735350177636],
              [-0.10402679443359375, 51.508582196691954],
              [-0.11157989501953125, 51.50826167077801],
              [-0.11501312255859375, 51.50756719022885],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-0.09784698486328125, 51.51419103517789],
              [-0.0855731964111328, 51.51419103517789],
              [-0.0855731964111328, 51.51675484563643],
              [-0.09784698486328125, 51.51675484563643],
              [-0.09784698486328125, 51.51419103517789],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [-0.08668899536132812, 51.51130657591914],
        },
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [-0.11089324951171875, 51.51536613288439],
        },
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [-0.11509895324707031, 51.51082581495246],
            [-0.11157989501953125, 51.51119974058721],
            [-0.10617256164550781, 51.51098606917176],
            [-0.10376930236816405, 51.5116270804117],
            [-0.10128021240234374, 51.51205441622754],
            [-0.09664535522460938, 51.51178733181241],
            [-0.08892059326171875, 51.51349664501128],
          ],
        },
      },
    ],
  };
  const pois: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          'marker-color': '#7e7e7e',
          'marker-size': 'medium',
          'marker-symbol': '',
          'metro': 'false',
          'square': 'true',
        },
        geometry: {
          type: 'Point',
          coordinates: [-0.08664608001708983, 51.5176895323032],
        },
      },
      {
        type: 'Feature',
        properties: {
          'marker-color': '#7e7e7e',
          'marker-size': 'medium',
          'marker-symbol': '',
          'poi': 'Cathedral',
        },
        geometry: {
          type: 'Point',
          coordinates: [-0.09849071502685547, 51.513897256014594],
        },
      },
      {
        type: 'Feature',
        properties: {
          'marker-color': '#7e7e7e',
          'marker-size': 'medium',
          'marker-symbol': '',
          'street': 'holborn',
        },
        geometry: {
          type: 'Point',
          coordinates: [-0.11230945587158205, 51.5181702208344],
        },
      },
      {
        type: 'Feature',
        properties: {
          'marker-color': '#7e7e7e',
          'marker-size': 'medium',
          'marker-symbol': '',
          'hello': 'world',
        },
        geometry: {
          type: 'Point',
          coordinates: [-0.09849071502685547, 51.52011962787024],
        },
      },
      {
        type: 'Feature',
        properties: {
          'marker-color': '#7e7e7e',
          'marker-size': 'medium',
          'marker-symbol': '',
          'metro': 'true',
        },
        geometry: {
          type: 'Point',
          coordinates: [-0.10518550872802733, 51.52003951689637],
        },
      },
      {
        type: 'Feature',
        properties: {
          'marker-color': '#7e7e7e',
          'marker-size': 'medium',
          'marker-symbol': '',
          'metro': 'true',
        },
        geometry: {
          type: 'Point',
          coordinates: [-0.1038980484008789, 51.51146682844727],
        },
      },
    ],
  };

  const toGeoJSON = (g: GeoJSON.FeatureCollection) => {
    const geo = geoJSON(g, {
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          console.log(feature);
          state.feature = feature;
          m.redraw();
        });
      },
    });
    return geo;
  };

  const state = {
    visible: ['test'],
    count: 0,
    overlays: {
      test: toGeoJSON(geojson),
      pois: toGeoJSON(pois),
    } as { [key: string]: FeatureGroup },
    feature: undefined as Feature<Geometry, any> | undefined,
  };
  state.overlays.test.on('layeradd', (le: LeafletEvent) => {
    console.log(JSON.stringify(state.overlays.test.toGeoJSON(), null, 2));
  });

  return {
    view: () => {
      const { overlays, visible, feature } = state;
      return m('.row', [
        m(
          '.col.s12.m7.l8',
          m('.introduction', [
            m(LeafletMap, {
              style: 'width: 100%; height: 400px; margin-top: 20px;',
              view: [51.505, -0.09] as LatLngExpression,
              zoom: 13,
              overlays,
              visible,
              // editable: ['test', 'pois'],
              onMapClicked: console.log,
              showScale: { imperial: false },
              onLayerEdited: (f: FeatureGroup) => console.log(JSON.stringify(f.toGeoJSON(), null, 2)),
              onLoadedOverlaysChanged: (v: string[]) => (state.visible = v),
              onLoad: (e: Event) => console.log(e),
              onUnload: (e: Event) => console.log(e),
            }),
            m(Button, {
              style: 'margin: 10px 10px 0 0;',
              label: 'Add layer',
              onclick: () => {
                if (overlays) {
                  // tslint:disable-next-line: no-string-literal
                  overlays[`click${state.count++}`] = geoJSON(pois);
                }
              },
            }),
            m(Button, {
              style: 'margin: 10px 10px 0 0;',
              label: 'Remove layer',
              disabled: !state.overlays.hasOwnProperty(`click${state.count - 1}`),
              onclick: () => {
                if (state.overlays) {
                  state.count--;
                  // tslint:disable-next-line: no-string-literal
                  delete overlays[`click${state.count}`];
                }
              },
            }),
            m(Button, {
              style: 'margin: 10px 10px 0 0;',
              label: 'Toggle layer pois',
              onclick: () => {
                if (state.visible.indexOf('pois') >= 0) {
                  state.visible = visible.filter(l => l !== 'pois');
                } else {
                  state.visible.push('pois');
                }
              },
            }),
            m('h2', 'Mithril-Leaflet'),
            m(
              'p',
              `This is a mithril component to create a Leaflet-based map. The component uses
leaflet-draw for editing, where the last selected editable layer can be edited. When multiple layers
are present, a layer control is shown. You can also enable the scale control, optionally choosing
between metric, imperial or both.`
            ),
            m('p', [
              'You can check out the API documentation ',
              m('a[href="https://erikvullings.github.io/mithril-leaflet/typedoc/index.html"]', 'here'),
              ' or review the ',
              m(
                'a[href="https://github.com/erikvullings/mithril-leaflet/blob/master/packages/example/src/components/home/home-page.ts"]',
                'source code'
              ),
              '.',
            ]),
            m('h3', 'Installation'),
            m('p', 'First, you need to install the required packages:'),
            m(CodeBlock, {
              language: 'console',
              code: `npm i mithril leaflet leaflet-draw mithril-leaflet
# Also install the typings if you use TypeScript
npm i --save-dev @types/leaflet @types/leaflet-draw @types/geojson @types/mithril`,
            }),
            m('p', 'Next, you can use them inside your application:'),
            m(CodeBlock, {
              code: `import { LeafletMap } from 'mithril-leaflet';
import { Feature, Geometry } from 'geojson';
import { LatLngExpression, FeatureGroup, LeafletEvent, geoJSON } from 'leaflet';
';

...
m(LeafletMap, {
  style: 'width: 100%; height: 400px; margin-top: 20px;',
  view: [51.505, -0.09] as LatLngExpression,
  zoom: 13,
  // overlays,
  // visible,
  editable: ['test', 'pois'],
  onMapClicked: console.log,
  showScale: { imperial: false },
  onLayerEdited: (f: FeatureGroup) => console.log(JSON.stringify(f.toGeoJSON(), null, 2)),
  onLoadedOverlaysChanged: (v: string[]) => (state.visible = v),
})
`,
            }),
          ])
        ),
        m('.col.s12.m5.l4', [m('h1', 'Feature'), feature ? m('pre', JSON.stringify(feature, null, 2)) : undefined]),
      ]);
    },
  };
};
