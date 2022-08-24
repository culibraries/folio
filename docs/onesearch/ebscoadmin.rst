EDS Administration
==================

Management
----------

Current administration of the product is controlled by `Metadata
Optimization and
Discovery <https://o365coloradoedu.sharepoint.com/sites/LIB-MO-DAM-DS/SitePages/Metadata-Optimization-and-Discov-Section.aspx>`__.
Please see our `Management
Document <https://docs.google.com/document/d/1ssiCgnfIJQ9wTWE7E2BMVt8mfAj6LngcFatI7pdyPCQ/edit#>`__
for more information.

Current Products are the New EBSCO Discovery Service UI, Full Text
Finder, and Publication Finder.

`Feedback and
reports <https://drive.google.com/drive/folders/1mBA1F5BoRgzGSiOlqOSKfzPDCrkgfZ-4>`__
can be found in the FOLIO drive.

Authentication
--------------

We authenticate users via SSO. This means that users will need to have
an active identikey that is authorized to use library resources. This
authorization is set by HR. Please see our `circulation
page <https://www.colorado.edu/libraries/services/borrowing-university-libraries-materials/borrowing-privileges>`__
for a breakdown of privileges. For more advanced privilege requests
(visiting scholar, etc.) please email libera@colorado.edu and we will
explore what access avenues are available based on the user's situation.

Authentication settings must be set under Site/Group/Main,
Authentication Menu, and for each profile under the Linking Tab and in
each individual profile to work properly.

Authentication order cannot include guest

-  We have ours set up as ip,sso for EDS and ip,url,cookie,uid for ehost (which is still on EZProxy)

-  Guest is added via the url: https://discovery.ebsco.com/c/3czfwv/?acr_values=ip+guest

Current authentication for EDS searches from the website is for the site
to check IP range, and if the user is not in the IP range show the guest
banner. Off-campus users will need to login via SSO (not EZProxy) to
authenticate. Off-campus users will then need to login again, this time
via EZProxy, to be able to use the Full Text Finder links.

Adding New Collections to EDS
-----------------------------

All collections added to EDS/Publication Finder/Full Text Finder are
approved through our `New Collection
workflow <https://docs.google.com/document/d/16ucQz_M-XQbhNI-3XXdTObXi7OggdPrvteY0i_iLpEk/edit#heading=h.ghmhfvd9szlo>`__.

You can see the full content of any collection by searching FT Y or FT N
and limiting by Content Provider. For non-EBSCO collections you can also
do an LN collection number search (example: LN cat09225a)

EDS does not merge records.

-  EDS may only show one record if there are multiples of the same record from the same provider. There still may be many results for the same title.

-  EDS will not merge catalog records a) with each other or b) with non-catalog records. Since we load a separate bib for each electronic resource we purchase, this means that there may be many results for the same title.

Custom Catalog Collection
~~~~~~~~~~~~~~~~~~~~~~~~~

Our custom catalog - CU Boulder Catalog (cat09225a) - is Sierra
(switching to FOLIO 2023). You can find full information on MARC to
Sierra mapping in our `mapping
spreadsheet <https://docs.google.com/spreadsheets/d/1UgnRufLuiTrno9IIUQ4KY3BcQTA8LHXWXVz8DAzDfg4/edit#gid=1895587743>`__.
Changes are uploaded to OneSearch 8:00 am MST daily via Scheduler, and
we will do full catalog refreshes quarterly
(`instructions <https://docs.google.com/document/d/1bSTaD2WNbHbSVd98YIsnqLoScZ9pDIljdGP6c7571Ss/edit#heading=h.euoqi7ikvetl>`__).

Other Custom Collections
~~~~~~~~~~~~~~~~~~~~~~~~

Current Custom (IR) Collection Include the following:

+----------------------+----------------------------------------------+
| IR Collection        | Information                                  |
+======================+==============================================+
| CU Boulder LibGuides | CU Boulder Research Guides (ir01997a) -      |
|                      | periodically have to reload as Springshare   |
|                      | does not send deletes via OAI-PMH - had to   |
|                      | create a customlink as IR guides get deleted |
|                      | when you reload collections                  |
+----------------------+----------------------------------------------+
| CU Databases         | CU Databases (ir01971a) - Will have to treat |
|                      | as CU Boulder LibGuides as has the same      |
|                      | OAI-PMH issues - Relevancy increased.        |
+----------------------+----------------------------------------------+
| CU Digital Library   | CU Digital Library (ir01970a) - LUNA         |
+----------------------+----------------------------------------------+
| CU Scholar           | CU Scholar (ir01946a) - Samvera              |
+----------------------+----------------------------------------------+

If you have a collection that you would like to be included in OneSearch
via this method, please contact the OneSearch Product Owner.

You can see the full content of any collection that is a local
collection by doing a LN search or by doing a FT Y or FT N search and
sorting by Content Provider.

Set up notes:

-  The online access link was often added to the old EDS UI and not the new one, we had to request that be added each time.

-  Pub and Doc Type mapping can often be wrong, make sure to double check.

-  IR collections will be added to the Collection Filter.

-  Individual IR Collection relevancy weight can be increased but you must first request it.

Custom Holdings 
~~~~~~~~~~~~~~~

In addition to EBSCO managed collections in our knowledgebase
(holdings), we can also upload custom packages/collections to Holdings
Management to show in the search results. We only do this for a few
collections as they are difficult to maintain. You can find these
collections by going to Vendor and searching for “Boulder”.

+----------------------------------+----------------------------------+
| Custom Holding Collection        | Information                      |
+==================================+==================================+
| American Library Association     |                                  |
+----------------------------------+----------------------------------+
| CU Boulder Print Serials         | We load print serials so that    |
| Holdings                         | they show in the publication     |
|                                  | placard/A-Z journals search to   |
|                                  | make our print journals easier   |
|                                  | to find and access.              |
+----------------------------------+----------------------------------+
| Springer eBooks                  |                                  |
+----------------------------------+----------------------------------+
| Site Subscription (*New York     | We put the \* to make them       |
| Times: Online Access,            | appear at the top of the list.   |
| \*Chronicle of Higher Education: |                                  |
| Online Access, \*Denver Business |                                  |
| Journal: Online Access, \*Wall   |                                  |
| Street Journal: Online Access)   |                                  |
+----------------------------------+----------------------------------+

Searching Collections in EDS
----------------------------

The default EDS search is “In my Library”. We decided to limit the
search to just items that we have online access to or we have cataloged.
This limiter was set up by emailing EBSCO. In user testing (Spring 2022)
users did not always know to deselect “In my Library” to see all
results, but as it is our current default we’d want to do more in depth
investigation if we were to change it.

CU Library Catalog and CU Databases collections are weighted to be
heavier than other collections. We weighted these to help with known
item searching. Any IR collections can be weighted or unweighted by
emailing EBSCO.

The following settings are also included in a default search.

+----------------------------------+----------------------------------+
| Setting                          | Information                      |
+==================================+==================================+
| Expander: Apply equivalent       | This increases the relevancy of  |
| subjects                         | topic searching.                 |
+----------------------------------+----------------------------------+
| Search Mode: Find all my search  | For a default search, a search   |
| terms                            | looks for all search terms in    |
|                                  | the search query.                |
+----------------------------------+----------------------------------+

We have disabled Expanders “Apply related words” and “Also search within
the full text of the articles” as they did not noticeably increase the
relevancy of topic searching.

We have disabled Search Modes “Find any of my search terms”,
“Boolean/Phrase”, and “SmartText Searching”. Although SmartText
Searching increased known article citation precision, it decreased topic
relevance so we decided to go with “Find all my search terms”.
Boolean/Phrase also decreased relevancy of topic search. `EBSCO’s
description of search
modes. <https://support.ebsco.com/help/?int=eds&lang=en&feature_id=SrcMode&TOC_ID=Always&SI=0&BU=0&GU=1&PS=0&ver=live&dbs=>`__

EBSCO allows users to search by field codes. The `MARC mapping
sheet <https://docs.google.com/spreadsheets/d/1UgnRufLuiTrno9IIUQ4KY3BcQTA8LHXWXVz8DAzDfg4/edit#gid=1895587743>`__
shows which field codes go with MARC values, as well as has a `general
list of field
codes <https://docs.google.com/spreadsheets/d/1UgnRufLuiTrno9IIUQ4KY3BcQTA8LHXWXVz8DAzDfg4/edit#gid=2131701920>`__.

Other Special Search Features
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To get the Publication Placard to show up when users select filters (as
opposed to not showing at all when users select filters): Added the old
Publication type profile to our account. Put it on as a top level link
(which is not available in the new UI) in Branding EBSCOadmin, then put
in this code in our bottom branded htm (which also has our analytics).
We can’t get it to show when users use advanced search.

We cannot currently rename any filters in the new UI,nor can we add
special filters (like catalog only, etc.) to the top.

Only In my Library, Online Full Text, Peer reviewed and All Time are
sticky (aka stay on when users adjust their search terms). Source and
all the other filters are not. Source also just shows the first 5
options when a user uses them.

Linking in EDS and Full Text Finder
-----------------------------------

Link behavior in EDS is decided by our CustomLink order.

Generally Links should behave like this:

Online Full Text Only

Link to full text

Link to full text, google scholar, Report a Problem

Online and Print

Link to catalog, link to Prospector, link to Illiad, Link to full text

Link to catalog, link to Prospector, link to Illiad, Link to full text

Print Only

Link to catalog, link to Prospector, link to Illiad

Link to catalog, link to Prospector, link to Illiad

Link behavior in Full Text Finder is decided by the link assigned to an
individual package and how those links are ordered.

Other EBSCOadmin settings
-------------------------

We provide a full overview of how EBSCOadmin is set up and how EDS in
EBSCOadmin is set up.

To test out changes to EBSCOadmin we have test profiles set up. To back
up a profile go to: Profile Maintenance / Copy Profiles / Source Profile
should be Main and eds (or whatever source you’d like to make changes
on) / Target Profile should be backups of eds and codeMMYY (example
edsnew0722) / Select all Parameters and press Submit
