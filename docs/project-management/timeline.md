# Timeline

```{mermaid}
  gantt
      dateFormat  YYYY-MM-DD
      excludes  weekends
      axisFormat %Y-%m-%d

      Millenium Contract Ends :milestone, 2023-06-30, 0d
      Sierra Contract Ends :milestone, 2023-09-30, 0d

      section Project Management
      Refactor Timeline     :active, 2022-02-21, 1w
      Review Requirements   :active, 2022-02-21, 38d
      Documentation :2022-04-01, 12w
      Training :2022-05-01, 20w

      section Operations
      Scratch Environment :active, o1, 2022-03-01, 4w
      Kiwi                :o2, after o1,  4w
      Infrastructure improvements :o3, after o2, 12w
      Lotus :o4, after o3, 4w

      section Discovery
      EDS over Sierra   :active, d1, 2022-02-21, 12w
      Relevency Testing  :12w

      section Data Migration
      Acquisitions Mapping :active, 2022-02-21, 4w
      Refine Instance, Holdings, and Item mapping :active, 2022-02-21, 8w
      Dry Runs :2022-04-01, 8w
      Law Data Mapping      :d4, 2022-09-01  , 12w
      Law Dry Runs      :d5, after d4, 12w
```
