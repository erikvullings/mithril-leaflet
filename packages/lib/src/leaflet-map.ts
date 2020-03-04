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
  DrawMap,
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
  /** Fired when the number of zoomlevels on the map is changed due to adding or removing a layer. */
  onZoomlevelsChange?: (e: LeafletEvent) => void;
  /** ResizeEvent	Fired when the map is resized. */
  onResize?: (e: L.ResizeEvent) => void;
  /** Fired when the map is destroyed with remove method. */
  onUnload?: (e: LeafletEvent) => void;
  /**
   * Fired? when the map needs to redraw its content (this usually happens on map zoom or load).
   * Very useful for creating custom overlays.
   */
  onViewReset?: (e: LeafletEvent) => void;
  /** Fired when the map is initialized (when its center and zoom are set for the first time). */
  onLoad?: (e: LeafletEvent) => void;
  /** Fired when the map zoom is about to change (e.g. before zoom animation). */
  onZoomStart?: (e: LeafletEvent) => void;
  /** Fired when the view of the map starts changing (e.g. user starts dragging the map). */
  onMoveStart?: (e: LeafletEvent) => void;
  /** Fired repeatedly during any change in zoom level, including zoom and fly animations. */
  onZoom?: (e: LeafletEvent) => void;
  /** Fired repeatedly during any movement of the map, including pan and fly animations. */
  onMove?: (e: LeafletEvent) => void;
  /** Fired when the map has changed, after any animations. */
  onZoomEnd?: (e: LeafletEvent) => void;
  /** Fired when the center of the map stops changing (e.g. user stopped dragging the map). */
  onMoveEnd?: (e: LeafletEvent) => void;
  /** Callback that is run once after initialisation to return the underlying Leaflet.map object */
  onLoaded?: (map: Map) => void;
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
    map.on(L.Draw.Event.CREATED, (event: LayerEvent) => {
      const layer = event.layer;
      drawLayer.addLayer(layer);
    });
    if (onLayerEdited) {
      map.on(L.Draw.Event.CREATED, () => {
        onLayerEdited(drawLayer);
      });
      map.on(L.Draw.Event.DELETED, () => {
        onLayerEdited(drawLayer);
      });
      map.on(L.Draw.Event.EDITSTOP, () => {
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
        zoom,
        baseLayers,
        overlays,
        visible,
        editable,
        onMapClicked,
        onMapDblClicked,
        showScale,
        onLayerEdited,
        onLoadedOverlaysChanged: onVisibilityChanged,
        onZoomlevelsChange,
        onResize,
        onUnload,
        onLoad,
        onZoomStart,
        onMoveStart,
        onZoom,
        onMove,
        onZoomEnd,
        onMoveEnd,
        onLoaded,
      },
    }) => {
      const { id } = state;
      const map = L.map(id) as DrawMap;
      map.on('load', (e: LeafletEvent) => {
        // In order to fix an issue when loading leaflet in a modal or tab: https://stackoverflow.com/a/53511529/319711
        setTimeout(() => {
          map.invalidateSize();
        }, 0);
        if (onLoad) {
          onLoad(e);
        }
      });
      if (onUnload) {
        map.on('unload', (e: LeafletEvent) => onUnload(e));
      }
      if (!zoom && overlays && Object.keys(overlays).length > 0) {
        const markerArray = Object.keys(overlays).reduce((acc, cur) => {
          const overlay = overlays[cur];
          acc.push(...overlay.getLayers());
          return acc;
        }, [] as L.Layer[]);
        map.fitBounds(L.featureGroup(markerArray).getBounds(), { padding: new L.Point(20, 20)});
      } else {
        map.setView(view, zoom || 13);
      }
      state.map = map;
      state.onVisibilityChanged = onVisibilityChanged;
      state.overlays = { ...overlays };
      state.editable = editable;
      map.on('overlayadd', (e: L.LeafletEvent) => {
        overlayAddEventHandler(e, onLayerEdited);
        updateShowHideOverlays(e, true);
      });
      map.on('overlayremove', (e: L.LeafletEvent) => {
        stopEditing(e);
        updateShowHideOverlays(e, false);
      });

      if (onMapClicked) {
        map.on('click', (e: LeafletMouseEvent) => onMapClicked(e));
      }
      if (onMapDblClicked) {
        map.on('dblclick', (e: L.LeafletEvent) => onMapDblClicked(e as LeafletMouseEvent));
      }
      if (onZoomlevelsChange) {
        map.on('zoomlevelschange', (e: LeafletEvent) => onZoomlevelsChange(e));
      }
      if (onResize) {
        map.on('resize', (e: L.ResizeEvent) => onResize(e));
      }
      if (onZoomStart) {
        map.on('zoomstart', (e: LeafletEvent) => onZoomStart(e));
      }
      if (onMoveStart) {
        map.on('movestart', (e: LeafletEvent) => onMoveStart(e));
      }
      if (onZoom) {
        map.on('zoom', (e: LeafletEvent) => onZoom(e));
      }
      if (onMove) {
        map.on('move', (e: LeafletEvent) => onMove(e));
      }
      if (onZoomEnd) {
        map.on('zoomend', (e: LeafletEvent) => onZoomEnd(e));
      }
      if (onMoveEnd) {
        map.on('moveend', (e: LeafletEvent) => onMoveEnd(e));
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

      if (onLoaded) {
        onLoaded(map);
      }
    },
  };
};
