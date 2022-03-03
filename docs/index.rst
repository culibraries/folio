.. FOLIO at University of Colorado documentation master file, created by
   sphinx-quickstart on Fri Feb 18 13:29:40 2022.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

FOLIO at University of Colorado
===========================================================

------------
About FOLIO
------------

Welcome to the FOLIO documentation wiki! FOLIO is the LSP for the CU Boulder and CU Law Libraries.

* Our current version is **Iris**
* Our current sandbox environment: `sandbox-folio.colorado.edu <https://sandbox-folio.colorado.edu>`_
* Chrome is the recommended browser for FOLIO

To get appropriate user permissions to FOLIO please put in a `ServiceNow ticket <https://colorado.service-now.com/lib_landing.do>`_ with Libraries Specific Applications and Technology

----------------------
Training documentation
----------------------

* `General FOLIO Product Documentation <https://docs.folio.org/docs/>`_
* `Cornell FOLIO Documentation <https://confluence.cornell.edu/display/ltstr/FOLIO>`_

---------------
Release naming
---------------

The flower names can be hard to reference in code and version control for documentation. We are going to use an alternative ``year.release.hotfix``.

============================== =========
Flower name Version            Tag
============================== =========
Kiwi initial release           2021.r3.0
Kiwi Hotfix #1                 2021.r3.1
Kiwi Hotfix #2                 2021.r3.2
Lotus initial release          2022.r1.0
Morning Glory initial release  2022.r2.0
Nolana initial release         2022.r3.0
============================== =========


.. toctree::
   :maxdepth: 1
   :caption: FOLIO Apps
   :hidden:

   apps/index.rst   
   settings/index.rst   
   configuration/index.rst

.. toctree::
   :maxdepth: 1
   :caption: Administrative
   :hidden:

   admin/index.rst
   adr/index.rst
   resources/index.rst
