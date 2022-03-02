# Architecture diagrams

## Amazon Web Services

```{mermaid}
flowchart LR
  subgraph az[Availability Zone]
    direction TB
    subgraph VPC
      direction TB
      subgraph files[File Storage]
        s3[/s3\]
      end
      subgraph eks[Kubernetes via EKS]
        direction TB
        subgraph ng1[Nodegroup]
          direction TB
          n1(Node 1)
          n2(Node 2)
        end
        subgraph ng2[Nodegroup]
          direction TB
          n3(Node 3)
          n4(Node 4)
        end
      end
      subgraph rds
        psql[(Database)]
      end
      subgraph es[ElasticSearch]
        openSearch[AWS OpenSearch]
      end
      eks<-->rds
      eks-->ses
      eks<-->files
      eks<-->es
    end
      subgraph ses[SES]
        %% Outside of VPC
        ses1[Email Service]
      end
      r53[Route 53]-->eks
  end
```

## FOLIO Application

```{mermaid}
flowchart LR
  classDef kafka fill:#6200EE,color:#fff;
  classDef db fill:#03DAC6;
  classDef kafkadb fill:#2196F3;
  subgraph Data Storage
    kafka[(Kafka)]:::kafka
    db[(PostgreSQL)]:::db
    kafkadb[(Kafka and PostgreSQL)]:::kafkadb
  end
  subgraph FOLIO Project Code
    direction TB
    Stripes -->okapi <--> a & c & e & f & i & in & l & o & r & req & u & p
    subgraph a[Agreements]
    end
    subgraph c[Circulation]
      c1[mod-circulation]
      c2[mod-circulation-storage]:::kafkadb
      c3[mod-feesfines]:::db
      c4[mod-patron-blocks]:::db
      c5[mod-courses]:::db
      c6[mod-patron]
    end
    subgraph e[eHoldings & ERM]
    end
    subgraph f[Finance]
    end
    subgraph i[Inventory]
      i1[mod-inventory]:::kafkadb
      i2[mod-inventory-storage]:::kafkadb
      i3[mod-source-record-storage]:::kafkadb
      i4[mod-source-record-manager]:::kafkadb
      i5[mod-search]:::kafkadb
      i6[mod-quick-marc]:::kafkadb
      i7[mod-copycat]:::db
    end
    subgraph in[Invoices]
    end
    subgraph l[Licenses]
    end
    subgraph o[Orders]
    end
    subgraph r[Receiving]
    end
    subgraph req[Requests]
    end
    subgraph u[Users]
      u1[mod-user]:::db
      u2[mod-user-bl]:::db
      u3[mod-login]
      u4[mod-permissions]:::db
      u5[mod-password-validator]:::db
    end
    subgraph p[Platform Modules]
    end
  end
```
