// wasm wrapper around cubiomes for landon.cool/seed
#include "cubiomes/generator.h"
#include "cubiomes/finders.h"
#include "cubiomes/util.h"
#include <stdlib.h>
#include <string.h>

#define EXPORT __attribute__((visibility("default")))

static Generator g;
static int mc_ver;
static uint64_t seed;
static int *cache = 0;
static size_t cache_len = 0;
static int out[4096];
static unsigned char colors[256][3];

static const int VERS[] = { MC_NEWEST, MC_1_20, MC_1_19, MC_1_18, MC_1_17, MC_1_16, MC_1_12, MC_1_7 };

EXPORT int ver_count(void) { return sizeof(VERS) / sizeof(VERS[0]); }
EXPORT int *out_ptr(void) { return out; }
EXPORT unsigned char *colors_ptr(void) { initBiomeColors(colors); return &colors[0][0]; }
EXPORT const char *biome_name(int id) { const char *s = biome2str(mc_ver, id); return s ? s : ""; }

EXPORT void init(int ver_idx, unsigned int lo, unsigned int hi, int large) {
    mc_ver = VERS[ver_idx];
    seed = ((uint64_t)hi << 32) | lo;
    setupGenerator(&g, mc_ver, large ? LARGE_BIOMES : 0);
    applySeed(&g, DIM_OVERWORLD, seed);
}

// biomes for a w*h area at scale (1,4,16,64,256). x,z are in scaled coords. y=63 (sea level) in block terms
EXPORT int *biomes(int x, int z, int w, int h, int scale) {
    Range r = { scale, x, z, w, h, scale == 1 ? 63 : 63 / 4, 1 };
    if (scale >= 4) r.y = 63 >> 2;
    size_t need = getMinCacheSize(&g, r.scale, r.sx, r.sy, r.sz);
    if (need > cache_len) { free(cache); cache = malloc(need * sizeof(int)); cache_len = need; }
    if (genBiomes(&g, cache, r)) return 0;
    return cache;
}

// structures in a block area. writes x,z pairs to out, returns count
EXPORT int structures(int type, int x0, int z0, int x1, int z1) {
    StructureConfig sc;
    if (!getStructureConfig(type, mc_ver, &sc)) return 0;
    int rs = sc.regionSize * 16, n = 0;
    int rx0 = (int)floor((double)x0 / rs), rz0 = (int)floor((double)z0 / rs);
    int rx1 = (int)floor((double)x1 / rs), rz1 = (int)floor((double)z1 / rs);
    if ((long)(rx1 - rx0 + 1) * (rz1 - rz0 + 1) > 4000) return -1; // zoomed out too far
    for (int rz = rz0; rz <= rz1; rz++)
        for (int rx = rx0; rx <= rx1; rx++) {
            Pos p;
            if (!getStructurePos(type, mc_ver, seed, rx, rz, &p)) continue;
            if (p.x < x0 || p.x > x1 || p.z < z0 || p.z > z1) continue;
            if (!isViableStructurePos(type, &g, p.x, p.z, 0)) continue;
            if (n < 2047) { out[n * 2] = p.x; out[n * 2 + 1] = p.z; n++; }
        }
    return n;
}

EXPORT int strongholds(int max) {
    StrongholdIter sh;
    initFirstStronghold(&sh, mc_ver, seed);
    int n = 0;
    while (n < max && n < 2047) {
        int more = nextStronghold(&sh, &g);
        out[n * 2] = sh.pos.x; out[n * 2 + 1] = sh.pos.z; n++;
        if (more <= 0) break;
    }
    return n;
}

EXPORT int spawn(void) { Pos p = estimateSpawn(&g, 0); out[0] = p.x; out[1] = p.z; return 1; }

EXPORT int stype(int i) {
    static const int T[] = { Village, Outpost, Mansion, Monument, Desert_Pyramid, Jungle_Temple, Swamp_Hut, Igloo, Ancient_City, Trial_Chambers, Ruined_Portal, Shipwreck };
    return i < (int)(sizeof(T) / sizeof(T[0])) ? T[i] : -1;
}
