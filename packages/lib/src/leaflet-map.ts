import m, { FactoryComponent, Attributes } from 'mithril';
import { uniqueId } from './utils';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L, {
  Map,
  LatLngExpression,
  FeatureGroup,
  TileLayerOptions,
  LeafletEvent,
  LayersControlEvent,
  LeafletMouseEvent,
  Marker,
  Layer,
  LayerEvent,
  icon,
  LayerGroup,
  GeoJSON,
} from 'leaflet';
import 'leaflet-draw';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Assign the imported image assets before you do anything with Leaflet.
Marker.prototype.options.icon = icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

export interface ILeafletMap extends Attributes, TileLayerOptions {
  /** ID of the HTML map component. By default, a random ID is created. */
  id?: string;
  /**
   * Base map layer, specifies a URI pointing to a tile server.
   * If there are multiple baseMapUris, the first one will be shown by default,
   * and a layer control will be added to the map.
   * @default http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png
   * @see https://wiki.openstreetmap.org/wiki/Tile_servers
   * @see https://leafletjs.com/reference-1.4.0.html#tilelayer
   */
  baseLayers?: { [key: string]: { url: string; options: TileLayerOptions } };
  /** Overlay maps: if provided and length > 1, automatically add a layer control */
  overlays?: { [key: string]: FeatureGroup };
  /** Keys of the visible layers */
  visible?: string[];
  /** Keys of the editable overlay layers: the last editable layer that is selected becomes editable. */
  editable?: string[];
  /** Set initial view in longitude, latitude, @default [51.505,-0.09] */
  view?: LatLngExpression;
  /** Zoom level, @default 13 */
  zoom?: number;
  /** Default html style to apply, e.g. the component must have its height set. @default 'height: 400px' */
  style?: string;
  /** The class name(s) for this virtual element, as a space-separated list. */
  className?: string;
  /** Should we show an optional scale */
  showScale?:
    | boolean
    | {
        /**
         * Maximum width of the control in pixels. The width is set dynamically to show round
         * values (e.g. 100, 200, 500).
         * @default 100
         */
        maxWidth?: number;
        /**
         * Whether to show the metric scale line (m/km).
         * @default true
         */
        metric?: boolean;
        /**
         * Whether to show the imperial scale line (mi/ft).
         * @default true
         */
        imperial?: boolean;
        /**
         * If true, the control is updated on moveend, otherwise it's always up-to-date (updated on move).
         * @default false
         */
        updateWhenIdle?: boolean;
      };
  /**
   * Called when the layer was edited (either features were moved, deleted, or created).
   * Useful in case you want to update a layer or export it to GeoJSON (using layer.toGeoJSON).
   */
  onLayerEdited?: (geojson: FeatureGroup) => void;
  /** Callback that is called when the map is clicked (or tapped). */
  onMapClicked?: (e: LeafletMouseEvent) => void;
  /** Callback that is called when the map is double clicked (or tapped). */
  onMapDblClicked?: (e: LeafletMouseEvent) => void;
  /**
   * Callback that is called when an overlay is toggled on/off.
   * Returns a list of the (keys of the) visible layers.
   */
  onLoadedOverlaysChanged?: (e: string[]) => void;
}

export const LeafletMap: FactoryComponent<ILeafletMap> = () => {
  const state = {} as {
    id: string;
    map: Map;
    /** When the draw control is visible, store a reference */
    layerCtrl?: L.Control.Layers;
    /** When editing a layer, store a reference to the current draw control so we can remove it */
    drawCtrl?: L.Control.Draw;
    /** Overlay maps: if provided and length > 1, automatically add a layer control */
    overlays?: { [key: string]: GeoJSON | LayerGroup };
    /** Keys of the initially visible layers */
    visible: string[];
    /** Key of the overlay that is currently being edited */
    editingOverlay?: string;
    /** Keys of the editable layers */
    editable?: string[];
    /**
     * Callback that is called when an overlay is toggled on/off.
     * Returns a list of the (keys of the) visible layers.
     */
    onVisibilityChanged?: (e: string[]) => void;
  };
  const osmBaseLayer = 'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';

  /** Stop editing and remove the draw control */
  const stopEditing = (e: LeafletEvent) => {
    const { map, editingOverlay, drawCtrl } = state;
    const { name } = e as LayersControlEvent;
    if (editingOverlay === name && drawCtrl) {
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITSTOP);
      map.off(L.Draw.Event.DELETED);
      map.removeControl(drawCtrl);
      state.drawCtrl = undefined;
      state.editingOverlay = undefined;
    }
  };

  /** Add a draw control to the map */
  const addDrawControl = (drawLayer: FeatureGroup, onLayerEdited?: (geojson: FeatureGroup) => void) => {
    const { map, drawCtrl } = state;
    if (drawCtrl) {
      map.removeControl(drawCtrl);
    }

    const drawControl = new L.Control.Draw({
      draw: {
        circle: false,
        circlemarker: false,
        marker: {
          icon: Marker.prototype.options.icon,
        },
      },
      edit: {
        featureGroup: drawLayer,
      },
    });
    map.addControl(drawControl);
    map.on(L.Draw.Event.CREATED, event => {
      const layer = (event as LayerEvent).layer;
      drawLayer.addLayer(layer);
    });
    if (onLayerEdited) {
      map.on(L.Draw.Event.EDITSTOP, () => {
        onLayerEdited(drawLayer);
      });
      map.on(L.Draw.Event.DELETED, () => {
        onLayerEdited(drawLayer);
      });
    }
    state.drawCtrl = drawControl;
  };

  /** Add a layer control to the map */
  const addLayerControl = (bl?: { [key: string]: Layer }, overlays?: { [key: string]: FeatureGroup }) => {
    const { map } = state;
    state.layerCtrl = L.control.layers(bl, overlays).addTo(map);
  };

  /** If the overlay is editable, add the draw control, and invoke onLayerEdit on updates of the layer. */
  const overlayAddEventHandler = (e: LeafletEvent, onLayerEdited?: (geojson: FeatureGroup) => void) => {
    const { overlays, editable } = state;
    const { name } = e as LayersControlEvent;
    if (!editable || editable.indexOf(name) < 0) {
      return;
    }
    if (!overlays || !overlays.hasOwnProperty(name)) {
      return;
    }
    addDrawControl(overlays[name] as FeatureGroup, onLayerEdited);
    state.editingOverlay = name;
  };

  /** When an overlay is toggled, update the visible layers list */
  const updateShowHideOverlays = (e: LeafletEvent, add: boolean) => {
    const { name } = e as LayersControlEvent;
    const { visible, onVisibilityChanged } = state;
    if (add) {
      if (visible.indexOf(name) < 0) {
        visible.push(name);
      }
    } else {
      state.visible = visible.filter(v => v !== name);
    }
    if (onVisibilityChanged) {
      onVisibilityChanged([...state.visible]);
    }
  };

  /** Determine which overlays must be added to the map */
  const showHideOverlays = (visible?: string[]) => {
    const { overlays, map } = state;
    if (!state.visible) {
      state.visible = [];
    }
    if (visible && overlays) {
      // Add initially visible overlays to the map.
      Object.keys(overlays)
        .filter(key => visible.indexOf(key) >= 0 && state.visible.indexOf(key) < 0)
        .forEach(key => {
          state.visible.push(key);
          map.addLayer(overlays[key]);
          // overlays[key].addTo(map);
        });
      // Remove visible overlays to the map.
      Object.keys(overlays)
        .filter(key => visible.indexOf(key) < 0 && state.visible.indexOf(key) >= 0)
        .forEach(key => {
          state.visible = state.visible.filter(v => v !== key);
          map.removeLayer(overlays[key]);
        });
    }
  };

  /** Add a new base layer or overlay on request */
  const updateLayers = (overlays?: { [key: string]: FeatureGroup }) => {
    const { map, overlays: existingOverlays = {} } = state;
    if (overlays) {
      Object.keys(overlays).forEach(key => {
        if (existingOverlays[key] !== overlays[key]) {
          existingOverlays[key] = overlays[key];
          if (!state.layerCtrl) {
            addLayerControl();
          }
          if (state.layerCtrl) {
            state.layerCtrl.addOverlay(overlays[key], key);
          }
        }
      });
    }
    Object.keys(existingOverlays).forEach(key => {
      if (!overlays || !overlays.hasOwnProperty(key)) {
        if (state.layerCtrl) {
          state.layerCtrl.removeLayer(existingOverlays[key]);
        }
        map.removeLayer(existingOverlays[key]);
        delete existingOverlays[key];
      }
    });
  };

  const defaultBaseLayer = {
    osm: L.tileLayer(osmBaseLayer, {
      subdomains: ['a', 'b'],
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 24,
    }),
  };

  return {
    oninit: ({ attrs: { id } }) => {
      state.id = id || uniqueId();
    },
    onupdate: ({ attrs: { visible, overlays } }) => {
      updateLayers(overlays);
      showHideOverlays(visible);
    },
    view: ({ attrs: { style = 'height: 400px', className } }) => {
      const { id } = state;

      return m(`div[id=${id}]`, { style, className });
    },
    oncreate: ({
      attrs: {
        view = [51.505, -0.09] as LatLngExpression,
        zoom = 13,
        baseLayers,
        overlays,
        visible,
        editable,
        onMapClicked,
        onMapDblClicked,
        showScale,
        onLayerEdited,
        onLoadedOverlaysChanged: onVisibilityChanged,
        // ...params
      },
    }) => {
      const { id } = state;
      const map = L.map(id).setView(view, zoom);
      state.map = map;
      state.onVisibilityChanged = onVisibilityChanged;
      state.overlays = { ...overlays };
      state.editable = editable;
      map.on('overlayadd', e => {
        overlayAddEventHandler(e, onLayerEdited);
        updateShowHideOverlays(e, true);
      });
      map.on('overlayremove', e => {
        stopEditing(e);
        updateShowHideOverlays(e, false);
      });

      if (onMapClicked) {
        map.on('click', e => onMapClicked(e as LeafletMouseEvent));
      }
      if (onMapDblClicked) {
        map.on('dblclick', e => onMapDblClicked(e as LeafletMouseEvent));
      }

      const bl = baseLayers
        ? Object.keys(baseLayers).reduce(
            (acc, key) => {
              const cur = baseLayers[key];
              acc[key] = L.tileLayer(cur.url, cur.options);
              return acc;
            },
            {} as { [key: string]: Layer }
          )
        : defaultBaseLayer;
      const baseLayer = Object.keys(bl)
        .map(key => bl[key])
        .shift();
      if (baseLayer) {
        baseLayer.addTo(map);
      }
      if ((baseLayers && Object.keys(baseLayers).length > 1) || (overlays && Object.keys(overlays).length > 0)) {
        addLayerControl(bl, overlays);
      }

      showHideOverlays(visible);

      if (showScale) {
        if (typeof showScale === 'boolean') {
          L.control.scale().addTo(map);
        } else {
          L.control.scale(showScale).addTo(map);
        }
      }
    },
  };
};
