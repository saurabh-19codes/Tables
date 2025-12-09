// FinancialDashboard1.jsx
import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  CardRounded,
  ProgressCircle,
  Label,
  Select,
  SelectOption,
} from '@americanexpress/dls-react';
import { AxpExpandColumnRenderer } from './AxpExpandColumnRenderer';
import { useApi } from '../hooks/useAuthData';
import { formatNumberWithComma } from '../utilities';
import BaseTable from './BaseTable';
import FinancialModal from './FinancialModal';
import './FinancialTable.css';

const FinancialDashbaord1 = (props) => {
  const { selectedYear, setSelectedYear } = props;
  const [isReady, setIsReady] = useState(false);
  const [isModalOpen, toggleModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [selectedDirector, setSelectedDirector] = useState('');
  const [selectedEpic, setSelectedEpic] = useState('');
  const [alerts, setAlerts] = useState('');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loadingYearChange, setLoadingYearChange] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1];

  const priorityEpics = [
    'E17717: GMST - Platform Health 2023/2024',
    'E18885: 2024/2025 - Platform Health - Voltage',
    'E18889: 2024/2025 - Platform Health - A2A Authentication Secrets Management',
    'E18891: Platform Health - AIX DB2 Decom(kyndryl)',
    'E20438: GMST 2025 - Platform Health - Merchant Cache Resiliency',
    'E20459: GMST 2025 - Platform Health - Slide Express',
    'E20460: GMST 2025 - Platform Health - Enhance Production Process (Timeout and Retries)',
    'E20469: 2025 - Platform Health - Reactive - Global Merchant Services Tech (GMST)',
    'E18886: 2024 - Platform Health - Hydra',
  ];

  const { isLoading, data, error } = useApi('/financialDashboard/v2/epicDetails', {
    injectStatePayload: false,
    payload: { year: selectedYear },
  });

  const {
    isLoading: isFeatureDataLoading,
    data: featureData,
    run,
    error: isFeatureDataError,
  } = useApi('/financialDashboard/v2/featureData', {
    injectCredentials: false,
    injectStatePayload: false,
    payload: {
      epicId: selectedEpic?.split(':', 1),
      year: selectedYear,
      applicationOwnerName: selectedDirector,
    },
    fetchOptions: { defer: true },
  });

  const handleYearChange = (event) => {
    const newYear = Number(event.target.value);
    setSelectedYear(newYear);
    setLoadingYearChange(true);
  };

  const sortEpicRows = (rowsInput) => {
    if (!rowsInput || rowsInput.length === 0) return [];

    const totalRow = rowsInput.find((r) => r.epic === 'Total');
    const regular = rowsInput.filter((r) => r.epic !== 'Total');
    const sorted = [...regular].sort((a, b) => {
      const aIsPriority = priorityEpics.includes(a.epic);
      const bIsPriority = priorityEpics.includes(b.epic);

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      if (aIsPriority && bIsPriority) return priorityEpics.indexOf(a.epic) - priorityEpics.indexOf(b.epic);
      return a.epic.localeCompare(b.epic);
    });

    return totalRow ? [...sorted, totalRow] : sorted;
  };

  // Only call feature API (run) when both director & epic are selected (modal opened)
  useEffect(() => {
    if (selectedDirector && selectedEpic) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDirector, selectedEpic]);

  // Build modal drilldown columns & rows when featureData changes
  useEffect(() => {
    if (!isFeatureDataLoading && featureData?.body?.featureData) {
      const drillDownData = featureData.body;
      setModalData(drillDownData);
    } else if (!isFeatureDataLoading && !featureData) {
      setModalData(null);
    }
  }, [isFeatureDataLoading, featureData]);

  // Build main table rows & columns when data loads
  useEffect(() => {
    if (data && data.body) {
      const datal = data.body;
      // build unique directors list
      const uniqueDirectors = [];
      datal?.epicsData?.forEach((item) => {
        Object.keys(item?.epicWiseDirectorTotals || {}).forEach((key) => {
          if (!uniqueDirectors.some((ud) => ud.name === key)) {
            uniqueDirectors.push({ name: key, field: key.replace(/\s+/g, '').toLowerCase() });
          }
        });
      });

      // build rows
      const newData = datal?.epicsData?.map((epic) => {
        const directorData = {};
        uniqueDirectors.forEach((d) => {
          directorData[d.field] = epic.epicWiseDirectorTotals?.[d.name]
            ? formatNumberWithComma(epic.epicWiseDirectorTotals[d.name])
            : 0;
        });
        return {
          epic: epic.epic,
          allocationValue: formatNumberWithComma(epic.allocationValue),
          epicYtd: formatNumberWithComma(epic.epicYtd),
          ...directorData,
        };
      }) || [];

      // total row
      const totalObj = {
        epic: 'Total',
        allocationValue: formatNumberWithComma(datal?.budgetTotal),
        epicYtd: formatNumberWithComma(datal?.epicYTDTotal),
      };
      Object.keys(datal?.leadersTotal ?? {}).forEach((item) => {
        totalObj[item.replace(/\s+/g, '').toLowerCase()] = formatNumberWithComma(datal.leadersTotal[item]);
      });

      const finalRows = sortEpicRows([...newData, totalObj]);
      setRows(finalRows);

      // build tanstack columns
      const stickyLefts = {
        epic: 0,
        budget: 9 * 16, // approximate left pixels - not required but kept meta
        epicYtd: 18 * 16,
      };

      const baseColumns = [
        {
          accessorKey: 'epic',
          header: 'Epic',
          cell: (info) => {
            const epicName = info.getValue();
            // style for priority epic
            return (
              <div
                className={`ft-epic-cell ${priorityEpics.includes(epicName) ? 'ft-epic-priority' : ''}`}
              >
                {epicName}
              </div>
            );
          },
          meta: { sticky: true, left: stickyLefts.epic, minWidth: '14rem' },
        },
        {
          accessorKey: 'allocationValue',
          header: 'Budget',
          meta: { sticky: true, left: stickyLefts.budget, minWidth: '10rem' },
        },
        {
          accessorKey: 'epicYtd',
          header: 'Epic Ytd',
          meta: { sticky: true, left: stickyLefts.epicYtd, minWidth: '10rem' },
        },
      ];

      const directorColumns = uniqueDirectors.map((d, idx) => ({
        accessorKey: d.field,
        header: d.name.split(' ')[0],
        cell: (info) => {
          const cellValue = info.getValue();
          const row = info.row.original;
          return (
            <button
              type="button"
              className="ft-director-cell"
              onClick={(e) => {
                e.stopPropagation();
                if (row.epic !== 'Total') {
                  setSelectedDirector(d.name);
                  setSelectedEpic(row.epic);
                  toggleModal(true);
                }
              }}
            >
              {cellValue}
            </button>
          );
        },
        meta: { minWidth: '10rem' },
      }));

      setColumns([...baseColumns, ...directorColumns]);
      setIsReady(true);
      setLoadingYearChange(false);
    }
  }, [data]);

  const showErrorMessage = (
    <div className="text-align-center padding-0 dls-white-bg flex flex-column flex-justify-around flex-align-center flex-item-grow">
      <p>Failed to fetch data...!!</p>
    </div>
  );

  if (error || (data && data.status !== 200)) {
    return showErrorMessage;
  }

  // convert columns/rows into shape expected by BaseTable (tanstack columns are already created)
  return (
    <div className="col-xs-12 col-lg-12 col-md-12">
      <CardRounded>
        {isReady ? (
          <div className="financial-container">
            <div className="flex flex-align-items-baseline">
              <h2 className="flex flex-justify-center container margin-2-b">
                {`Financial Dashboard as of ${new Date().toISOString().split('T')[0]}`}
              </h2>
              <span>
                <Select
                  id="year-select"
                  className="dls-bright-blue-20-bg"
                  onChange={handleYearChange}
                  value={selectedYear}
                >
                  {years.map((year) => (
                    <SelectOption key={year} value={year}>
                      {year}
                    </SelectOption>
                  ))}
                </Select>
              </span>
            </div>

            {loadingYearChange ? (
              <div className="flex flex-justify-center">
                <ProgressCircle />
              </div>
            ) : (
              <div className="tableID stickyHeader dls-panel border-b customTableStyles">
                <BaseTable columns={columns} data={rows} enableExpand={false} />
              </div>
            )}

            {isModalOpen && (
              <FinancialModal
                shown={isModalOpen}
                onClose={() => {
                  toggleModal(false);
                  setModalData(null);
                  setSelectedDirector('');
                  setSelectedEpic('');
                }}
                selectedDirector={selectedDirector}
                selectedEpic={selectedEpic}
                featureData={modalData}
                isLoading={isFeatureDataLoading}
                isError={isFeatureDataError || (featureData && featureData?.status !== 200)}
                alerts={alerts}
              />
            )}
          </div>
        ) : (
          <ProgressCircle />
        )}
      </CardRounded>
    </div>
  );
};

FinancialDashbaord1.propTypes = {
  changeTab: PropTypes.func,
  selectedYear: PropTypes.number,
  setSelectedYear: PropTypes.func,
};

export default FinancialDashbaord1;
