module.exports = {
    okapi: { 'url': 'https://okapi.cublcta.com', 'tenant': 'culibraries' },
    config: {
        logCategories: 'core,path,action,xhr',
        logPrefix: '--',
        maxUnpagedResourceCount: 2000,
        showPerms: false
    },
    modules: {
        '@folio/acquisition-units': {},
        '@folio/agreements': {},
        '@folio/calendar': {},
        '@folio/checkin': {},
        '@folio/checkout': {},
        '@folio/circulation': {},
        '@folio/circulation-log': {},
        '@folio/courses': {},
        '@folio/dashboard': {},
        '@folio/data-export': {},
        '@folio/data-import': {},
        '@folio/developer': {},
        '@folio/eholdings': {},
        '@folio/erm-comparisons': {},
        '@folio/erm-usage': {},
        '@folio/export-manager': {},
        '@folio/finance': {},
        '@folio/inventory': {},
        '@folio/inventory-es': {},
        '@folio/invoice': {},
        '@folio/licenses': {},
        '@folio/local-kb-admin': {},
        '@folio/myprofile': {},
        '@folio/notes': {},
        '@folio/oai-pmh': {},
        '@folio/orders': {},
        '@folio/organizations': {},
        '@folio/plugin-bursar-export': {},
        '@folio/plugin-create-inventory-records': {},
        '@folio/plugin-find-agreement': {},
        '@folio/plugin-find-contact': {},
        '@folio/plugin-find-eresource': {},
        '@folio/plugin-find-erm-usage-data-provider': {},
        '@folio/plugin-find-import-profile': {},
        '@folio/plugin-find-instance': {},
        '@folio/plugin-find-interface': {},
        '@folio/plugin-find-license': {},
        '@folio/plugin-find-organization': {},
        '@folio/plugin-find-package-title': {},
        '@folio/plugin-find-po-line': {},
        '@folio/plugin-find-user': {},
        '@folio/plugin-find-organization': {},
        '@folio/quick-marc': {},
        '@folio/receiving': {},
        '@folio/remote-storage': {},
        '@folio/requests': {},
        '@folio/search': {},
        '@folio/servicepoints': {},
        '@folio/stripes-erm-components': {},
        '@folio/tags': {},
        '@folio/tenant-settings': {},
        '@folio/users': {}
    },
    branding: {
        logo: {
            src: './tenant-assets/cu-boulder-logo-text-black.svg',
            alt: 'University of Colorado Boulder Libraries',
        },
        favicon: {
            src: './tenant-assets/favicon-32x32.png',
        },
    }
};