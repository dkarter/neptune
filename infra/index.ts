import * as pulumi from '@pulumi/pulumi';
import * as digitalocean from '@pulumi/digitalocean';
import * as kubernetes from '@pulumi/kubernetes';

const config = new pulumi.Config();
const database_password = config.requireSecret('database_password');
const database_url = config.requireSecret('database_url');
const secret_key_base = config.requireSecret('secret_key_base');

const domainName = config.require('domain');
const subdomain = config.require('subdomain');

const domain = new digitalocean.Domain(domainName, {
  name: domainName,
});

const kubeVersions = digitalocean.getKubernetesVersions();
const cluster = new digitalocean.KubernetesCluster('do-cluster', {
  region: digitalocean.Region.NYC1,
  version: kubeVersions.then((versions) => versions.latestVersion),
  nodePool: {
    name: 'default',
    size: digitalocean.DropletSlug.DropletS1VCPU2GB,
    nodeCount: 2,
  },
});

export const kubeconfig = cluster.kubeConfigs[0].rawConfig;

const provider = new kubernetes.Provider('do-k8s', { kubeconfig });
const appLabels = { app: 'neptune' };
const dbLabels = { app: 'postgres' };

const secret = new kubernetes.core.v1.Secret(
  'neptune-secret',
  {
    metadata: {
      name: 'neptune-secret',
    },
    stringData: {
      database_password: database_password,
      database_url: database_url,
      secret_key_base: secret_key_base,
    },
  },
  { provider }
);

const db = new kubernetes.apps.v1.StatefulSet(
  'postgres-database',
  {
    metadata: {
      name: 'postgres-database',
    },
    spec: {
      selector: {
        matchLabels: dbLabels,
      },
      serviceName: 'postgres-service',
      replicas: 1,
      template: {
        metadata: { labels: dbLabels },
        spec: {
          containers: [
            {
              name: 'postgres',
              image: 'postgres',
              volumeMounts: [
                {
                  name: 'postgres-volume',
                  mountPath: '/var/lib/postgresql/data',
                },
              ],
              env: [
                {
                  name: 'POSTGRES_PASSWORD',
                  valueFrom: {
                    secretKeyRef: {
                      name: secret.metadata.name,
                      key: 'database_password',
                    },
                  },
                },

                {
                  name: 'POSTGRES_DB',
                  value: 'neptune_prod',
                },

                {
                  name: 'PGDATA',
                  value: '/var/lib/postgresql/data/pgdata',
                },
              ],
            },
          ],
        },
      },

      volumeClaimTemplates: [
        {
          metadata: { name: 'postgres-volume' },
          spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
              requests: {
                storage: '1Gi',
              },
            },
          },
        },
      ],
    },
  },
  { provider }
);

new kubernetes.core.v1.Service(
  'postgres-service',
  {
    metadata: {
      name: 'postgres-service',
    },
    spec: {
      type: 'ClusterIP',
      selector: db.spec.template.metadata.labels,
      ports: [{ port: 5432, targetPort: 5432 }],
    },
  },
  { provider }
);

const app = new kubernetes.apps.v1.Deployment(
  'neptune-deployment',
  {
    spec: {
      selector: { matchLabels: appLabels },
      replicas: 3,
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [
            {
              name: 'neptune',
              // TODO: interpolate the tag from git sha?
              image: 'dkarter/neptune:1.2',
              env: [
                {
                  name: 'SECRET_KEY_BASE',
                  valueFrom: {
                    secretKeyRef: {
                      name: secret.metadata.name,
                      key: 'secret_key_base',
                    },
                  },
                },
                {
                  name: 'DATABASE_URL',
                  valueFrom: {
                    secretKeyRef: {
                      name: secret.metadata.name,
                      key: 'database_url',
                    },
                  },
                },
                {
                  name: 'PORT',
                  value: '4000',
                },
                {
                  name: 'POD_IP',
                  valueFrom: { fieldRef: { fieldPath: 'status.podIP' } },
                },
              ],
            },
          ],
        },
      },
    },
  },
  { provider }
);

const appService = new kubernetes.core.v1.Service(
  'neptune-service',
  {
    metadata: {
      name: 'neptune-service',
    },
    spec: {
      type: 'LoadBalancer',
      selector: app.spec.template.metadata.labels,
      ports: [{ port: 80, targetPort: 4000 }],
    },
  },
  { provider }
);

// allows cluster pods to find each other via internal cluster DNS
new kubernetes.core.v1.Service(
  'neptune-headless',
  {
    metadata: {
      name: 'neptune-headless',
    },
    spec: {
      type: 'ClusterIP',
      selector: app.spec.template.metadata.labels,
      clusterIP: 'None',
    },
  },
  { provider }
);

export const ingressIp = appService.status.loadBalancer.ingress[0].ip;

new digitalocean.DnsRecord(subdomain, {
  name: subdomain,
  type: 'A',
  domain: domain.name,
  value: ingressIp,
});

export const hostname = `${subdomain}.${domainName}`;
export const url = `http://${hostname}`;
